// Groups (T19). Server only; every query is scoped to the owner id the caller got from `auth.getUser()`. Groups are private to their
// owner: nothing here reads another parent's group, member or friend.
import "server-only";
import type { Group, GroupStore, GroupSummary, LastPlaydate } from "@/lib/domain/groups";
import type { TimeMode } from "@/lib/rules/types";
import { adminClient } from "./admin";
import { shownPlace } from "./shown-place";

export const groupStore: GroupStore = {
  async ownFriendIds(ownerId, friendIds) {
    const { data, error } = await adminClient().from("friends").select("id").eq("owner_id", ownerId).in("id", [...friendIds]);
    if (error) throw new Error(`ownFriendIds failed: ${error.code}`);
    return (data ?? []).map((f) => f.id);
  },

  async saveGroup(ownerId, groupId, name, friendIds) {
    const { data, error } = await adminClient().rpc("save_group", {
      p_owner_id: ownerId,
      p_group_id: groupId as string, // null creates a group (migration 0007)
      p_name: name,
      p_friend_ids: [...friendIds],
    });
    if (error?.code === "P0002") return null;
    if (error || !data) throw new Error(`saveGroup failed: ${error?.code}`);
    return data;
  },

  async removeMember(ownerId, groupId, friendId) {
    const { data, error } = await adminClient().from("group_members").delete().eq("owner_id", ownerId).eq("group_id", groupId).eq("friend_id", friendId).select("friend_id");
    if (error) throw new Error(`removeMember failed: ${error.code}`);
    return (data?.length ?? 0) > 0;
  },

  async deleteGroup(ownerId, groupId) {
    const { data, error } = await adminClient().from("groups").delete().eq("owner_id", ownerId).eq("id", groupId).select("id");
    if (error) throw new Error(`deleteGroup failed: ${error.code}`);
    return (data?.length ?? 0) > 0;
  },
};

type GroupRow = { id: string; name: string; group_members: { friend_id: string; friends: { parent_name: string; label: string; kindred_user_id: string | null } | null }[] };

const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

/** The owner's groups, newest first, with how many families and their initials. */
export async function listGroups(ownerId: string): Promise<GroupSummary[]> {
  const { data, error } = await adminClient()
    .from("groups")
    .select("id, name, group_members(friend_id, friends(parent_name, label, kindred_user_id))")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .overrideTypes<GroupRow[], { merge: false }>();
  if (error) throw new Error(`listGroups failed: ${error.code}`);
  return (data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g.group_members.length,
    initials: g.group_members.map((m) => initial(m.friends?.parent_name ?? "")),
    friendIds: g.group_members.map((m) => m.friend_id),
  }));
}

/** One of the owner's groups with its members, or null (another parent's id is not found). */
export async function getGroup(ownerId: string, groupId: string): Promise<Group | null> {
  const { data, error } = await adminClient()
    .from("groups")
    .select("id, name, group_members(friend_id, friends(parent_name, label, kindred_user_id))")
    .eq("owner_id", ownerId)
    .eq("id", groupId)
    .maybeSingle()
    .overrideTypes<GroupRow, { merge: false }>();
  if (error) throw new Error(`getGroup failed: ${error.code}`);
  if (!data) return null;
  const members = data.group_members
    .map((m) => ({ friendId: m.friend_id, label: m.friends?.label ?? "", parentName: m.friends?.parent_name ?? "", hasKindred: !!m.friends?.kindred_user_id }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return { id: data.id, name: data.name, members };
}

/** "Last playdate" on a group page: the owner's most recent playdate that invited any of these friends (a reading: the doc names it only). */
export async function lastPlaydateWith(ownerId: string, friendIds: readonly string[]): Promise<LastPlaydate | null> {
  if (!friendIds.length) return null;
  const { data, error } = await adminClient()
    .from("invites")
    .select("playdates(id, title, mode, timezone, start_at, end_at, final_start_at, final_end_at, place_name, place_address, place_provider_id, created_at, status)")
    .eq("organizer_id", ownerId)
    .in("friend_id", [...friendIds])
    .overrideTypes<
      {
        playdates: {
          id: string;
          title: string;
          mode: TimeMode;
          timezone: string;
          start_at: string | null;
          end_at: string | null;
          final_start_at: string | null;
          final_end_at: string | null;
          place_name: string | null;
          place_address: string | null;
          place_provider_id: string | null;
          created_at: string;
          status: string;
        } | null;
      }[],
      { merge: false }
    >();
  if (error) throw new Error(`lastPlaydateWith failed: ${error.code}`);
  const latest = (data ?? [])
    .flatMap((r) => (r.playdates && r.playdates.status !== "cancelled" ? [r.playdates] : []))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!latest) return null;
  const date = (v: string | null) => (v ? new Date(v) : null);
  return {
    id: latest.id,
    title: latest.title,
    mode: latest.mode,
    timezone: latest.timezone,
    start: date(latest.final_start_at) ?? date(latest.start_at),
    end: date(latest.final_end_at) ?? date(latest.end_at),
    ...(await shownPlace(latest)),
  };
}
