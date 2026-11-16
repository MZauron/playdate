"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { requireParent } from "@/lib/auth/require-parent";
import { friendLinkStore } from "@/lib/db/friend-links";
import { friendStore } from "@/lib/db/friends";
import { friendLinkLimiter, newFriendLink } from "@/lib/domain/friend-links";
import { addFriend, friendsLimiter, parseAddFriendForm, removeFriend, renameFriend, type FriendFailure } from "@/lib/domain/friends";
import { enCA } from "@/lib/i18n/en-CA";

const errors = enCA.friends.errors;

function message(failure: FriendFailure): string {
  if (failure.code === "DUPLICATE") return errors.DUPLICATE(failure.existingLabel ?? "");
  return errors[failure.code];
}

/** Which field the message belongs under (the whole form for the rest). */
export type AddFriendState = { version: number; errors: Record<string, string>; added?: string; addedId?: string };

export async function addFriendAction(previous: AddFriendState, form: FormData): Promise<AddFriendState> {
  const { user } = await requireParent(); // the owner is the signed-in parent, whatever the form says
  const result = await addFriend({ store: friendStore, phoneHashKey: env.PHONE_HASH_KEY, limiter: friendsLimiter }, user.id, parseAddFriendForm(form));
  if (!result.ok) return { version: previous.version, errors: { [result.field ?? "form"]: message(result) } };
  revalidatePath("/friends");
  revalidatePath("/plan");
  return { version: previous.version + 1, errors: {}, added: enCA.friends.added(result.friend.label), addedId: result.friend.id };
}

export type FriendRowState = { error?: string; done?: boolean };

export async function renameFriendAction(_previous: FriendRowState, form: FormData): Promise<FriendRowState> {
  const { user } = await requireParent();
  const result = await renameFriend(friendStore, user.id, { friendId: String(form.get("friendId") ?? ""), label: String(form.get("label") ?? "") });
  if (!result.ok) return { error: message(result) };
  revalidatePath("/friends");
  revalidatePath("/plan");
  return { done: true };
}

export async function removeFriendAction(_previous: FriendRowState, form: FormData): Promise<FriendRowState> {
  const { user } = await requireParent();
  const result = await removeFriend(friendStore, user.id, String(form.get("friendId") ?? ""));
  if (!result.ok) return { error: message(result) };
  revalidatePath("/friends");
  revalidatePath("/plan");
  return { done: true };
}

/** T34: a new Invite to Kindred link for the signed-in parent (one per share). Only its hash is kept; the link goes to their phone. */
export async function newFriendLinkAction(): Promise<{ url?: string; error?: string }> {
  const { user } = await requireParent();
  const result = await newFriendLink({ store: friendLinkStore, limiter: friendLinkLimiter, linkBase: env.PUBLIC_LINK_BASE }, user.id);
  return result.ok ? { url: result.url } : { error: enCA.friendLink.tooMany };
}

/** T34: Stop my old links. Every Invite to Kindred link this parent shared stops working. */
export async function stopFriendLinksAction(): Promise<{ ok: boolean }> {
  const { user } = await requireParent();
  await friendLinkStore.removeLinks(user.id);
  return { ok: true };
}
