// Guards for pages and actions of signed-in parents (T05). `getCurrentUser` verifies the session with the identity service.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getParentProfile, type ParentProfile } from "@/lib/db/profiles";
import { getCurrentUser, type CurrentUser } from "./supabase-server";

/** The signed-in user, or the sign-in page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

const profileOf = cache((userId: string) => getParentProfile(userId));

/** A signed-in parent who finished Setup; a signed-out visitor goes to sign-in, a new parent to Setup. */
export async function requireParent(): Promise<{ user: CurrentUser; profile: ParentProfile }> {
  const user = await requireUser();
  const profile = await profileOf(user.id);
  if (!profile) redirect("/setup");
  return { user, profile };
}

/** Where a signed-in parent belongs: Home once Setup is done, Setup before. */
export async function homeFor(user: CurrentUser): Promise<"/" | "/setup"> {
  return (await profileOf(user.id)) ? "/" : "/setup";
}
