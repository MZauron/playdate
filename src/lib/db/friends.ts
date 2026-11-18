// Friends (T07). Server only; every query is scoped to the owner id the caller got from `auth.getUser()`.
import "server-only";
import type { Friend, FriendStore } from "@/lib/domain/friends";
import { adminClient } from "./admin";
import { shownPlace } from "./shown-place";

const COLUMNS = "id, parent_name, child_first_name, label, kindred_user_id";
type Row = { id: string; parent_name: string; child_first_name: string | null; label: string; kindred_user_id: string | null; friend_children?: { child_id: string }[] };

const toFriend = (row: Row): Friend => ({
  id: row.id,
  parentName: row.parent_name,
  childFirstName: row.child_first_name,
  label: row.label,
  hasKindred: row.kindred_user_id !== null,
  ...(row.friend_children ? { childIds: row.friend_children.map((c) => c.child_id) } : {}),
});
/** T42: the friend's columns and which of the owner's children they know. */
const WITH_KIDS = `${COLUMNS}, friend_children(child_id)`;

export const friendStore: FriendStore = {
  async findProfileIdByHash(phoneHash) {
    const { data, error } = await adminClient().from("profiles").select("id").eq("phone_hash", phoneHash).maybeSingle();
    if (error) throw new Error(`findProfileIdByHash failed: ${error.code}`);
    return data?.id ?? null;
  },

  async insertFriend(input) {
    const { data, error } = await adminClient()
      .from("friends")
      .insert({
        owner_id: input.ownerId,
        parent_name: input.parentName,
        child_first_name: input.childFirstName,
        label: input.label,
        phone_hash: input.phoneHash,
        kindred_user_id: input.kindredUserId,
      })
      .select(COLUMNS)
      .single();
    if (error?.code === "23505") {
      // This owner already has a friend with this number: say which one.
      const { data: existing } = await adminClient().from("friends").select("label").eq("owner_id", input.ownerId).eq("phone_hash", input.phoneHash).maybeSingle();
      return { status: "duplicate", label: existing?.label ?? input.label };
    }
    if (error || !data) throw new Error(`insertFriend failed: ${error?.code}`);
    return { status: "added", friend: toFriend(data) };
  },

  async renameFriend(ownerId, friendId, label) {
    const { data, error } = await adminClient().from("friends").update({ label }).eq("id", friendId).eq("owner_id", ownerId).select("id");
    if (error) throw new Error(`renameFriend failed: ${error.code}`);
    return (data?.length ?? 0) > 0;
  },

  async deleteFriend(ownerId, friendId) {
    const { data, error } = await adminClient().from("friends").delete().eq("id", friendId).eq("owner_id", ownerId).select("id");
    if (error) throw new Error(`deleteFriend failed: ${error.code}`);
    return (data?.length ?? 0) > 0;
  },
};

/**
 * Friends added as "gets a text" whose number has since joined Kindred become "has Kindred": a parent who signs up later should get
 * the next invite in the app. Only this owner's rows change; the friend list is the only thing it reveals to them.
 */
export async function refreshKindredMatches(ownerId: string): Promise<void> {
  const db = adminClient();
  const { data: unmatched, error } = await db.from("friends").select("id, phone_hash").eq("owner_id", ownerId).is("kindred_user_id", null);
  if (error) throw new Error(`refreshKindredMatches failed: ${error.code}`);
  if (!unmatched?.length) return;
  const { data: profiles, error: profileError } = await db.from("profiles").select("id, phone_hash").in("phone_hash", unmatched.map((f) => f.phone_hash));
  if (profileError) throw new Error(`refreshKindredMatches profiles failed: ${profileError.code}`);
  for (const profile of profiles ?? []) {
    if (profile.id === ownerId) continue; // a parent is never their own friend (friends_check)
    await db.from("friends").update({ kindred_user_id: profile.id }).eq("owner_id", ownerId).eq("phone_hash", profile.phone_hash!).is("kindred_user_id", null);
  }
}

/** The owner's friends, oldest first. */
export async function listFriends(ownerId: string): Promise<Friend[]> {
  await refreshKindredMatches(ownerId);
  const { data, error } = await adminClient().from("friends").select(WITH_KIDS).eq("owner_id", ownerId).order("created_at").order("id");
  if (error) throw new Error(`listFriends failed: ${error.code}`);
  return (data ?? []).map(toFriend);
}

/** T40: one of THIS owner's friends, or null (another parent's friend id finds nothing). */
export async function getFriend(ownerId: string, friendId: string): Promise<Friend | null> {
  const { data, error } = await adminClient().from("friends").select(WITH_KIDS).eq("owner_id", ownerId).eq("id", friendId).maybeSingle();
  if (error) throw new Error(`getFriend failed: ${error.code}`);
  return data ? toFriend(data) : null;
}

/** T40: a playdate on a friend's page. */
export type PlaydateTogether = { id: string; title: string; timezone: string; start: Date | null; end: Date | null; placeName: string | null; confirmed: boolean };

/**
 * T40: THIS owner's playdates with this friend. `open`: still on (links not expired, not cancelled), soonest first. `past`: confirmed
 * and over, newest first, five at most.
 */
export async function playdatesWithFriend(ownerId: string, friendId: string, now: Date): Promise<{ open: PlaydateTogether[]; past: PlaydateTogether[] }> {
  const { data, error } = await adminClient()
    .from("invites")
    .select("playdates(id, title, status, timezone, start_at, end_at, final_start_at, final_end_at, links_expire_at, place_name, place_address, place_provider_id)")
    .eq("organizer_id", ownerId)
    .eq("friend_id", friendId)
    .overrideTypes<
      {
        playdates: {
          id: string;
          title: string;
          status: string;
          timezone: string;
          start_at: string | null;
          end_at: string | null;
          final_start_at: string | null;
          final_end_at: string | null;
          links_expire_at: string;
          place_name: string | null;
          place_address: string | null;
          place_provider_id: string | null;
        } | null;
      }[],
      { merge: false }
    >();
  if (error) throw new Error(`playdatesWithFriend failed: ${error.code}`);
  const rows = (data ?? []).flatMap((r) => (r.playdates && r.playdates.status !== "cancelled" ? [r.playdates] : []));
  const at = (v: string | null) => (v ? new Date(v) : null);
  const items = await Promise.all(
    rows.map(async (row) => ({
      expires: new Date(row.links_expire_at),
      item: {
        id: row.id,
        title: row.title,
        timezone: row.timezone,
        start: at(row.final_start_at) ?? at(row.start_at),
        end: at(row.final_end_at) ?? at(row.end_at),
        placeName: (await shownPlace(row)).placeName,
        confirmed: row.status === "confirmed",
      },
    })),
  );
  const time = (p: PlaydateTogether) => p.start?.getTime() ?? Number.POSITIVE_INFINITY;
  const open = items.filter((i) => i.expires > now).map((i) => i.item).sort((a, b) => time(a) - time(b));
  const past = items
    .filter((i) => i.expires <= now && i.item.confirmed && i.item.end !== null && i.item.end < now)
    .map((i) => i.item)
    .sort((a, b) => time(b) - time(a))
    .slice(0, 5);
  return { open, past };
}

/** T42: which of THIS owner's children their friend knows (migration 0016); only their own friend and children are written. */
export async function setFriendChildren(ownerId: string, friendId: string, childIds: readonly string[]): Promise<boolean> {
  const { data, error } = await adminClient().rpc("set_friend_children", { p_owner_id: ownerId, p_friend_id: friendId, p_child_ids: [...childIds] });
  if (error) throw new Error(`setFriendChildren failed: ${error.code}`);
  return (data ?? 0) > 0;
}
