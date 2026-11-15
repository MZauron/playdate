// The organizer's playdate page (T10): who answered what (KD-08), who can come, and Confirm and send update (KD-09). The
// organizer is the signed-in parent the caller passes in; a playdate id from the URL only names a playdate, and another parent's
// is simply not found. Pure apart from the ports passed in.
import { z } from "zod";
import { answeredCount, friendStatus, type FriendStatus } from "@/lib/rules/answers";
import { checkConfirm } from "@/lib/rules/confirm";
import { linkExpiresAt } from "@/lib/rules/links";
import type { AnswerKind, DeclineReason, ErrorCode, FreeSlot, InviteChannel, PlaydateStatus, TimeMode, Zone } from "@/lib/rules/types";
import { firstWord } from "./playdates";

export type OrganizerInvite = {
  id: string;
  friendId: string;
  label: string;
  parentName: string;
  channel: InviteChannel;
  /** The organizer's own friend's number: used only for the organizer's Text buttons. */
  phoneE164: string;
  /** This time version's answer, if any. */
  answer: { kind: AnswerKind; reason: DeclineReason | null; note: string | null; answeredAt: Date } | null;
};

export type OrganizerPlaydate = {
  id: string;
  title: string;
  mode: TimeMode;
  status: PlaydateStatus;
  timezone: Zone;
  startAt: Date | null;
  endAt: Date | null;
  finalStartAt: Date | null;
  finalEndAt: Date | null;
  confirmedAt: Date | null;
  placeName: string | null;
  placeAddress: string | null;
  message: string;
  timeVersion: number;
  slots: FreeSlot[];
  invites: OrganizerInvite[];
};

export type PlaydatePageStore = {
  /** THIS organizer's playdate, or null (another parent's id is not found). */
  getForOrganizer(organizerId: string, playdateId: string): Promise<OrganizerPlaydate | null>;
  /** Sets the final time on THIS organizer's collecting playdate; false when there was none to change. */
  confirm(organizerId: string, playdateId: string, final: { start: Date; end: Date; confirmedAt: Date; linksExpireAt: Date }): Promise<boolean>;
};

export const isPlaydateId = (id: string) => z.uuid().safeParse(id).success;

// --- What the page shows ---------------------------------------------------------------------------------------------------------
export type FriendLine = { inviteId: string; label: string; status: FriendStatus; note: string | null };

export type PlaydatePageView = {
  friends: FriendLine[];
  answered: number;
  total: number;
  /** "2 families can come: Dev, Maya" (KD-09: the first names of the families who said yes). */
  comingNames: string[];
  /** KD-09: Confirm and send update is enabled at the first yes. */
  canConfirm: boolean;
  confirmed: boolean;
  cancelled: boolean;
  /** The final time once confirmed, else the set time. */
  start: Date | null;
  end: Date | null;
};

export function pageView(p: OrganizerPlaydate): PlaydatePageView {
  const confirmed = p.status === "confirmed";
  const answers = p.invites.flatMap((i) => (i.answer ? [i.answer] : []));
  const { answered, total } = answeredCount(p.invites.length, answers.length);
  const decision = checkConfirm({
    status: p.status,
    mode: p.mode,
    setTime: p.startAt && p.endAt ? { start: p.startAt, end: p.endAt } : null,
    answers: answers.map((a) => ({ kind: a.kind, pick: null })),
    slots: p.slots,
    zone: p.timezone,
  });
  return {
    friends: p.invites.map((i) => ({ inviteId: i.id, label: i.label, status: friendStatus(i.answer), note: i.answer?.kind === "no" ? i.answer.note : null })),
    answered,
    total,
    comingNames: p.invites.filter((i) => i.answer?.kind === "yes").map((i) => firstWord(i.parentName)),
    canConfirm: p.status === "collecting" && decision.ok,
    confirmed,
    cancelled: p.status === "cancelled",
    start: confirmed ? p.finalStartAt : p.startAt,
    end: confirmed ? p.finalEndAt : p.endAt,
  };
}

// --- Confirm and send update (KD-01: only this tap confirms) -----------------------------------------------------------------------
export type ConfirmResult = { ok: true } | { ok: false; code: ErrorCode | "NOT_FOUND" };

export async function confirmPlaydate(store: PlaydatePageStore, organizerId: string, playdateId: string, now: Date): Promise<ConfirmResult> {
  if (!isPlaydateId(playdateId)) return { ok: false, code: "NOT_FOUND" };
  const p = await store.getForOrganizer(organizerId, playdateId);
  if (!p) return { ok: false, code: "NOT_FOUND" };
  if (p.status === "confirmed") return { ok: true }; // already confirmed: nothing changes (confirmed_at keeps its meaning, KD-13)

  const decision = checkConfirm({
    status: p.status,
    mode: p.mode,
    setTime: p.startAt && p.endAt ? { start: p.startAt, end: p.endAt } : null,
    answers: p.invites.flatMap((i) => (i.answer ? [{ kind: i.answer.kind, pick: null }] : [])),
    slots: p.slots,
    zone: p.timezone,
  });
  if (!decision.ok) return { ok: false, code: decision.errors[0]!.code };

  const final = decision.value;
  const linksExpire = linkExpiresAt({ finalEnd: final.end, setEnd: p.endAt, slots: p.slots, zone: p.timezone });
  const changed = await store.confirm(organizerId, playdateId, { start: final.start, end: final.end, confirmedAt: now, linksExpireAt: linksExpire });
  return changed ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}
