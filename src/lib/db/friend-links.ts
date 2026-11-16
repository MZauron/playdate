// Invite to Kindred links (T34). Server only. A link is found by the sha256 of its token alone; what comes back about its owner is
// their first name and first child's first name, nothing else.
import "server-only";
import type { FriendLinkStore } from "@/lib/domain/friend-links";
import { adminClient } from "./admin";

export const friendLinkStore: FriendLinkStore = {
  async addLink(ownerId, tokenHash) {
    const { error } = await adminClient().from("friend_links").insert({ owner_id: ownerId, token_hash: tokenHash });
    if (error) throw new Error(`addLink failed: ${error.code}`);
  },

  async removeLinks(ownerId) {
    const { error } = await adminClient().from("friend_links").delete().eq("owner_id", ownerId);
    if (error) throw new Error(`removeLinks failed: ${error.code}`);
  },

  async findOwner(tokenHash) {
    const db = adminClient();
    const { data, error } = await db.from("friend_links").select("owner_id, profiles(first_name)").eq("token_hash", tokenHash).maybeSingle();
    if (error) throw new Error(`findOwner failed: ${error.code}`);
    if (!data?.profiles) return null;
    const { data: child, error: childError } = await db
      .from("children")
      .select("first_name")
      .eq("parent_id", data.owner_id)
      .order("sort")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (childError) throw new Error(`findOwner child failed: ${childError.code}`);
    return { ownerId: data.owner_id, firstName: data.profiles.first_name, childFirstName: child?.first_name ?? null };
  },

  async befriend(a, b) {
    const { error } = await adminClient().rpc("befriend", { p_a: a, p_b: b });
    if (error) throw new Error(`befriend failed: ${error.code}`);
  },
};
