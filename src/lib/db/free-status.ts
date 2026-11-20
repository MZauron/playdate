// T45 (KD-19): Free to play statuses. Server only; writes are scoped to the signed-in parent's own children, and a viewer reads only
// what friends_free_now gives them (friends both ways, still on).
import "server-only";
import type { FreeStore, FriendFree, OwnFree } from "@/lib/domain/free-status";
import type { FreeKind } from "@/lib/rules/free";
import { adminClient } from "./admin";

export const freeStore: FreeStore = {
  async set(parentId, childId, status) {
    const { data, error } = await adminClient().rpc("set_free_status", {
      p_parent_id: parentId,
      p_child_id: childId,
      p_kind: status.kind,
      p_words: status.words as string, // null for a time; the generated type doesn't know SQL parameters can be null
      p_until: status.until.toISOString(),
    });
    if (error) throw new Error(`set_free_status failed: ${error.code}`);
    return data === true;
  },
  async clear(parentId, childId) {
    const { error } = await adminClient().from("free_statuses").delete().eq("child_id", childId).eq("parent_id", parentId);
    if (error) throw new Error(`clear free status failed: ${error.code}`);
    return true;
  },
};

/** The parent's own children's statuses that are still on. */
export async function listOwnFree(parentId: string, now: Date): Promise<OwnFree[]> {
  const { data, error } = await adminClient().from("free_statuses").select("child_id, kind, words, until").eq("parent_id", parentId).gt("until", now.toISOString());
  if (error) throw new Error(`listOwnFree failed: ${error.code}`);
  return data.map((r) => ({ childId: r.child_id, kind: r.kind as FreeKind, words: r.words, until: new Date(r.until) }));
}

/** The friends' children this parent may see as free now (KD-19: friends both ways), by the parent's own friend row. */
export async function listFriendsFree(viewerId: string, now: Date): Promise<FriendFree[]> {
  const { data, error } = await adminClient().rpc("friends_free_now", { p_viewer: viewerId, p_now: now.toISOString() });
  if (error) throw new Error(`friends_free_now failed: ${error.code}`);
  return (data ?? []).map((r) => ({ friendId: r.friend_id, childFirstName: r.child_first_name, kind: r.kind as FreeKind, words: r.words, until: new Date(r.until) }));
}
