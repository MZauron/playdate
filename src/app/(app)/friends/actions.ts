"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { requireParent } from "@/lib/auth/require-parent";
import { friendStore } from "@/lib/db/friends";
import { addFriend, friendsLimiter, parseAddFriendForm, removeFriend, renameFriend, type FriendFailure } from "@/lib/domain/friends";
import { enCA } from "@/lib/i18n/en-CA";

const errors = enCA.friends.errors;

function message(failure: FriendFailure): string {
  if (failure.code === "DUPLICATE") return errors.DUPLICATE(failure.existingLabel ?? "");
  return errors[failure.code];
}

/** Which field the message belongs under (the whole form for the rest). */
export type AddFriendState = { version: number; errors: Record<string, string>; added?: string };

export async function addFriendAction(previous: AddFriendState, form: FormData): Promise<AddFriendState> {
  const { user } = await requireParent(); // the owner is the signed-in parent, whatever the form says
  const result = await addFriend({ store: friendStore, phoneHashKey: env.PHONE_HASH_KEY, limiter: friendsLimiter }, user.id, parseAddFriendForm(form));
  if (!result.ok) return { version: previous.version, errors: { [result.field ?? "form"]: message(result) } };
  revalidatePath("/friends");
  revalidatePath("/plan");
  return { version: previous.version + 1, errors: {}, added: enCA.friends.added(result.friend.label) };
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
