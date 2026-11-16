// Friends (T07). Server only; every query is scoped to the owner id the caller got from `auth.getUser()`.
import "server-only";
import type { Friend, FriendStore } from "@/lib/domain/friends";
import { adminClient } from "./admin";

const COLUMNS = "id, parent_name, child_first_name, label, kindred_user_id";
type Row = { id: string; parent_name: string; child_first_name: string | null; label: string; kindred_user_id: string | null };

const toFriend = (row: Row): Friend => ({
  id: row.id,
  parentName: row.parent_name,
  childFirstName: row.child_first_name,
  label: row.label,
  hasKindred: row.kindred_user_id !== null,
});

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
  const { data, error } = await adminClient().from("friends").select(COLUMNS).eq("owner_id", ownerId).order("created_at").order("id");
  if (error) throw new Error(`listFriends failed: ${error.code}`);
  return (data ?? []).map(toFriend);
}
