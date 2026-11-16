"use server";

import { redirect } from "next/navigation";
import { forgetFriendLink, rememberFriendLink } from "@/lib/auth/friend-link-cookie";
import { requireParent } from "@/lib/auth/require-parent";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { friendLinkStore } from "@/lib/db/friend-links";
import { acceptFriendLink, FRIEND_TOKEN_PATTERN } from "@/lib/domain/friend-links";

/** Not signed in yet: keep the link for after sign-in and Setup (Home sends them back here), then sign in. */
export async function joinAction(form: FormData): Promise<void> {
  const token = String(form.get("token") ?? "");
  if (FRIEND_TOKEN_PATTERN.test(token)) await rememberFriendLink(token);
  redirect((await getCurrentUser()) ? "/setup" : "/sign-in");
}

/** Yes: the signed-in parent and the link's owner become friends on both sides. Who says yes comes from the session only. */
export async function acceptAction(form: FormData): Promise<void> {
  const { user } = await requireParent();
  const result = await acceptFriendLink(friendLinkStore, String(form.get("token") ?? ""), user.id);
  await forgetFriendLink();
  if (!result.ok) redirect("/friends");
  console.info(`friend link accepted by=${user.id} owner=${result.owner.ownerId}`);
  redirect("/friends?befriended=1");
}

/** Not now, or a link that doesn't work: forget it and go Home. */
export async function forgetAction(): Promise<void> {
  await forgetFriendLink();
  redirect("/");
}
