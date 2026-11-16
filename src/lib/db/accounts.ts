// Delete my account (T24). Removing the auth user removes the profile, and the database removes everything that hangs off it:
// children, friends, groups, saved places, the playdates they planned, and (migration 0010, Q23 default) the invites they received.
import "server-only";
import { adminClient } from "./admin";

/** Only ever called with the signed-in parent's own id (from `auth.getUser()`). True when the account is gone. */
export async function deleteAccount(userId: string): Promise<boolean> {
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  return !error;
}
