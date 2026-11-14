// Parents and their children (T05). Server only; scoped to the parent id the caller got from `auth.getUser()`.
import "server-only";
import { adminClient } from "./admin";

export type NewChild = { firstName: string; ageLabel: string };

export type SetupStore = {
  /** Writes the parent and their children together. "exists" when this parent already finished Setup (Setup happens once). */
  createProfile(input: { userId: string; firstName: string; phoneHash: string; children: readonly NewChild[] }): Promise<"created" | "exists">;
};

export const setupStore: SetupStore = {
  async createProfile({ userId, firstName, phoneHash, children }) {
    const { error } = await adminClient().rpc("create_profile_with_children", {
      p_id: userId,
      p_first_name: firstName,
      p_phone_hash: phoneHash,
      p_children: children.map((c, sort) => ({ first_name: c.firstName, age_label: c.ageLabel, sort })),
    });
    if (!error) return "created";
    // 23505: this parent already has a profile (or this number's hash belongs to another profile).
    if (error.code === "23505") return "exists";
    throw new Error(`createProfile failed: ${error.code}`);
  },
};

export type ParentProfile = { id: string; firstName: string; children: { firstName: string; ageLabel: string }[] };

/** The signed-in parent's own profile and children, or null before Setup. */
export async function getParentProfile(userId: string): Promise<ParentProfile | null> {
  const db = adminClient();
  const { data: profile, error } = await db.from("profiles").select("id, first_name").eq("id", userId).maybeSingle();
  if (error) throw new Error(`getParentProfile failed: ${error.code}`);
  if (!profile) return null;
  const { data: children, error: childError } = await db
    .from("children")
    .select("first_name, age_label")
    .eq("parent_id", userId)
    .order("sort")
    .order("created_at");
  if (childError) throw new Error(`getParentProfile children failed: ${childError.code}`);
  return { id: profile.id, firstName: profile.first_name, children: (children ?? []).map((c) => ({ firstName: c.first_name, ageLabel: c.age_label })) };
}
