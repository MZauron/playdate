"use server";

import { revalidatePath } from "next/cache";
import { requireParent, requireUser } from "@/lib/auth/require-parent";
import { checkInStore } from "@/lib/db/check-ins";
import { inviteStore } from "@/lib/db/invites";
import { playdatePageStore } from "@/lib/db/playdate-page";
import { checkInAsInvitee, checkInAsOrganizer, checkInByLink, checkInLimiter, type CheckInResult } from "@/lib/domain/check-ins";
import { isPlaydateId } from "@/lib/domain/playdate-page";
import { TOKEN_PATTERN } from "@/lib/domain/invite-page";
import { enCA } from "@/lib/i18n/en-CA";

export type CheckInState = { error?: string; posted?: number; text?: string };

/**
 * A check-in (T35, KD-18). Three ways in, one rule: the organizer sends the playdate id (theirs, from the session); a friend without
 * an account sends their link's token; a Kindred friend sends their invite id (theirs only). Logs ids and codes only, never the note.
 */
export async function checkInAction(previous: CheckInState, form: FormData): Promise<CheckInState> {
  const input = { kind: String(form.get("kind") ?? ""), note: String(form.get("note") ?? "").slice(0, 400) };
  const playdateId = String(form.get("playdateId") ?? "");
  const token = String(form.get("token") ?? "");
  const inviteId = String(form.get("inviteId") ?? "");
  const deps = { invites: inviteStore, checkIns: checkInStore, limiter: checkInLimiter };
  const now = new Date();
  let result: CheckInResult;
  if (playdateId) {
    const { user } = await requireParent();
    const playdate = isPlaydateId(playdateId) ? await playdatePageStore.getForOrganizer(user.id, playdateId) : null;
    result = playdate ? await checkInAsOrganizer(deps, playdate, input, now) : { ok: false, code: "NOT_FOUND" };
    if (playdate) revalidatePath(`/playdates/${playdateId}`);
  } else if (inviteId) {
    result = await checkInAsInvitee(deps, inviteId, (await requireUser()).id, input, now);
    revalidatePath(`/invites/${inviteId}`);
  } else {
    result = await checkInByLink(deps, token, input, now);
    if (TOKEN_PATTERN.test(token)) revalidatePath(`/r/${token}`);
  }
  if (!result.ok) return { error: enCA.checkIns.errors[result.code] ?? enCA.somethingWentWrong };
  return { posted: (previous.posted ?? 0) + 1, text: `${enCA.checkIns.kinds[result.kind]}${result.note ? ` ${result.note}` : ""}` };
}
