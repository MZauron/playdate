"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { inviteStore } from "@/lib/db/invites";
import { requireUser } from "@/lib/auth/require-parent";
import { answerInvite, answerInviteAsInvitee, answerLimiters, parseAnswerForm, TOKEN_PATTERN } from "@/lib/domain/invite-page";
import { enCA } from "@/lib/i18n/en-CA";
import { clientAddress } from "@/platform/rate-limit";

export type AnswerState = { error?: string; answered?: number };

/**
 * A friend's answer. Two ways in, one rule: a friend without an account sends the token of the link they opened, which alone decides
 * which invite this is; a Kindred friend (T15) sends the invite id, which counts only if the signed-in user is that invite's invitee.
 * Logs nothing about the friend, the token or what they wrote.
 */
export async function answerAction(previous: AnswerState, form: FormData): Promise<AnswerState> {
  const token = String(form.get("token") ?? "");
  const inviteId = String(form.get("inviteId") ?? "");
  const parsed = parseAnswerForm(form);
  if (!parsed.success) return { error: enCA.invite.errors.INVALID_ANSWER };
  const deps = { store: inviteStore, limiters: answerLimiters };
  const result = inviteId
    ? await answerInviteAsInvitee(deps, inviteId, (await requireUser()).id, parsed.data, new Date())
    : await answerInvite(deps, token, clientAddress(await headers()), parsed.data, new Date());
  // The page reads the invite again: the saved answer, or the new time after STALE_TIME.
  if (inviteId) {
    revalidatePath(`/invites/${inviteId}`);
    revalidatePath("/");
  } else if (TOKEN_PATTERN.test(token)) revalidatePath(`/r/${token}`);
  if (!result.ok) return { error: enCA.invite.errors[result.code as keyof typeof enCA.invite.errors] ?? enCA.somethingWentWrong };
  return { answered: (previous.answered ?? 0) + 1 };
}
