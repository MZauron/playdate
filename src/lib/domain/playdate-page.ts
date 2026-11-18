// The organizer's playdate page (T10): who answered what (KD-08), who can come, and Confirm and send update (KD-09). The
// organizer is the signed-in parent the caller passes in; a playdate id from the URL only names a playdate, and another parent's
// is simply not found. Pure apart from the ports passed in.
import { z } from "zod";
import { answeredCount, friendStatus, type FriendStatus } from "@/lib/rules/answers";
import { checkConfirm } from "@/lib/rules/confirm";
import { linkExpiresAt } from "@/lib/rules/links";
import { groupPicks } from "@/lib/rules/picks";
import type { AnswerKind, DeclineReason, ErrorCode, FreeSlot, InviteChannel, PlaydateStatus, Range, TimeMode, Zone } from "@/lib/rules/types";
import type { Place } from "@/lib/integrations/places/types";
import { firstWord } from "./playdates";

export type OrganizerInvite = {
  id: string;
  friendId: string;
  label: string;
  parentName: string;
  channel: InviteChannel;
  /** This time version's answer, if any. */
  answer: { kind: AnswerKind; reason: DeclineReason | null; note: string | null; answeredAt: Date; pick?: Range | null } | null;
  /** KD-12: when this text friend was flagged for the "most families picked" text, once ever. */
  majorityNoticeAt?: Date | null;
};

export type OrganizerPlaydate = {
  id: string;
  /** T41: the organizer's children it is for (server only). */
  childIds?: string[];
  title: string;
  mode: TimeMode;
  status: PlaydateStatus;
  timezone: Zone;
  startAt: Date | null;
  endAt: Date | null;
  finalStartAt: Date | null;
  finalEndAt: Date | null;
  confirmedAt: Date | null;
  /** The place as shown: typed, or a searched place's name and address looked up for this read (never stored, Q6). */
  placeName: string | null;
  placeAddress: string | null;
  /** A searched place (T17): the provider's details, looked up when read; null for a typed place or none. */
  searchedPlace: Place | null;
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
  /** Cancels THIS organizer's playdate unless it already is; false when there was none to change. */
  cancel(organizerId: string, playdateId: string, cancelledAt: Date): Promise<boolean>;
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
  /** Availability (T14, KD-11): Times friends suggested, Most picked first, with the first name of each family who picked it. */
  suggestions: { range: Range; names: string[]; families: number; mostPicked: boolean }[];
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
    // KD-09: a set time at the first yes; availability once a family suggested a time (the organizer then taps one).
    canConfirm: p.status === "collecting" && (p.mode === "availability" ? familyPicks(p).length > 0 : decision.ok),
    confirmed,
    cancelled: p.status === "cancelled",
    start: confirmed ? p.finalStartAt : p.startAt,
    end: confirmed ? p.finalEndAt : p.endAt,
    suggestions: p.mode === "availability" ? groupPicks(familyPicks(p)).map((g) => ({ range: g.range, names: g.firstNames, families: g.families, mostPicked: g.mostPicked })) : [],
  };
}

/** The current picks, one per family, with the parent's first name (the organizer's own friends). */
export function familyPicks(p: OrganizerPlaydate) {
  return p.invites.flatMap((i) => (i.answer?.kind === "pick" && i.answer.pick ? [{ inviteId: i.id, firstName: firstWord(i.parentName), range: i.answer.pick }] : []));
}

// --- Confirm and send update (KD-01: only this tap confirms) -----------------------------------------------------------------------
export type ConfirmResult = { ok: true } | { ok: false; code: ErrorCode | "NOT_FOUND" };

export async function confirmPlaydate(store: PlaydatePageStore, organizerId: string, playdateId: string, now: Date, chosen: Range | null = null): Promise<ConfirmResult> {
  if (!isPlaydateId(playdateId)) return { ok: false, code: "NOT_FOUND" };
  const p = await store.getForOrganizer(organizerId, playdateId);
  if (!p) return { ok: false, code: "NOT_FOUND" };
  if (p.status === "confirmed") return { ok: true }; // already confirmed: nothing changes (confirmed_at keeps its meaning, KD-13)

  const decision = checkConfirm({
    status: p.status,
    mode: p.mode,
    setTime: p.startAt && p.endAt ? { start: p.startAt, end: p.endAt } : null,
    answers: p.invites.flatMap((i) => (i.answer ? [{ kind: i.answer.kind, pick: i.answer.pick ?? null }] : [])),
    slots: p.slots,
    zone: p.timezone,
    chosen, // availability: the suggested pick the organizer tapped (or their own range inside a free slot)
  });
  if (!decision.ok) return { ok: false, code: decision.errors[0]!.code };

  const final = decision.value;
  const linksExpire = linkExpiresAt({ finalEnd: final.end, setEnd: p.endAt, slots: p.slots, zone: p.timezone });
  const changed = await store.confirm(organizerId, playdateId, { start: final.start, end: final.end, confirmedAt: now, linksExpireAt: linksExpire });
  return changed ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}

// --- Cancel playdate (KD-15, Q1 default) -------------------------------------------------------------------------------------------
export type CancelResult = { ok: true } | { ok: false; code: "NOT_FOUND" };

/** Organizer only. Cancelling twice changes nothing; the links then say the playdate was cancelled and take no answer (KD-07). */
export async function cancelPlaydate(store: PlaydatePageStore, organizerId: string, playdateId: string, now: Date): Promise<CancelResult> {
  if (!isPlaydateId(playdateId)) return { ok: false, code: "NOT_FOUND" };
  const p = await store.getForOrganizer(organizerId, playdateId);
  if (!p) return { ok: false, code: "NOT_FOUND" };
  if (p.status === "cancelled") return { ok: true };
  return (await store.cancel(organizerId, playdateId, now)) ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}
