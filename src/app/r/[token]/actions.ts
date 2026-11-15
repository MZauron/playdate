"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { inviteStore } from "@/lib/db/invites";
import { answerInvite, answerLimiters, parseAnswerForm, TOKEN_PATTERN } from "@/lib/domain/invite-page";
import { enCA } from "@/lib/i18n/en-CA";
import { clientAddress } from "@/platform/rate-limit";

export type AnswerState = { error?: string; answered?: number };

/**
 * A friend's answer. No session: the token in the form is the link they opened, and it alone decides which invite this is.
 * Logs nothing about the friend, the token or what they wrote.
 */
export async function answerAction(previous: AnswerState, form: FormData): Promise<AnswerState> {
  const token = String(form.get("token") ?? "");
  const parsed = parseAnswerForm(form);
  if (!parsed.success) return { error: enCA.invite.errors.INVALID_ANSWER };
  const result = await answerInvite({ store: inviteStore, limiters: answerLimiters }, token, clientAddress(await headers()), parsed.data, new Date());
  // The page reads the invite again: the saved answer, or the new time after STALE_TIME.
  if (TOKEN_PATTERN.test(token)) revalidatePath(`/r/${token}`);
  if (!result.ok) return { error: enCA.invite.errors[result.code as keyof typeof enCA.invite.errors] ?? enCA.somethingWentWrong };
  return { answered: (previous.answered ?? 0) + 1 };
}
