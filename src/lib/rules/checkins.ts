// KD-18 (Q27, the owner's answer 2026-11-16): check-ins during a confirmed playdate. A few fixed check-ins ("We're here 📍") with an
// optional short note, from the organizer or a parent who is coming, from 30 minutes before the start to 1 hour after the end.
// No photos. Pure: the clock is passed in.
import { CHECKIN_CLOSES_AFTER_MINUTES, CHECKIN_NOTE_MAX_LENGTH, CHECKIN_OPENS_BEFORE_MINUTES } from "./config";
import { allow, deny, type AnswerKind, type Decision, type PlaydateStatus, type Range } from "./types";

export const CHECKIN_KINDS = ["here", "late", "all_good", "heading_home"] as const;
export type CheckInKind = (typeof CHECKIN_KINDS)[number];

export type CheckInTarget = { status: PlaydateStatus; finalStart: Date | null; finalEnd: Date | null };

/** The organizer, or one invite with its current answer. */
export type CheckInPoster = { organizer: true } | { organizer: false; answer: { kind: AnswerKind; pick?: Range | null } | null };

const MINUTE = 60_000;

/** When check-ins are open for this playdate; null when it isn't confirmed (or was cancelled). */
export function checkInWindow(target: CheckInTarget): Range | null {
  if (target.status !== "confirmed" || !target.finalStart || !target.finalEnd) return null;
  return {
    start: new Date(target.finalStart.getTime() - CHECKIN_OPENS_BEFORE_MINUTES * MINUTE),
    end: new Date(target.finalEnd.getTime() + CHECKIN_CLOSES_AFTER_MINUTES * MINUTE),
  };
}

export function checkInsOpen(target: CheckInTarget, now: Date): boolean {
  const span = checkInWindow(target);
  return !!span && now >= span.start && now < span.end;
}

/**
 * Who is coming (reading of Q27's "parents who are coming"): a yes on a set time, or, for availability, a pick that overlaps the
 * confirmed time. The organizer always may.
 */
export function mayCheckIn(target: CheckInTarget, poster: CheckInPoster): boolean {
  if (poster.organizer) return true;
  const a = poster.answer;
  if (!a) return false;
  if (a.kind === "yes") return true;
  if (a.kind === "pick" && a.pick && target.finalStart && target.finalEnd) return a.pick.start < target.finalEnd && a.pick.end > target.finalStart;
  return false;
}

export function checkCheckIn(
  target: CheckInTarget,
  poster: CheckInPoster,
  input: { kind: string; note?: string | null },
  now: Date,
): Decision<{ kind: CheckInKind; note: string | null }> {
  if (!checkInsOpen(target, now)) return deny({ code: "CHECKIN_CLOSED" });
  if (!mayCheckIn(target, poster)) return deny({ code: "CHECKIN_NOT_COMING" });
  if (!(CHECKIN_KINDS as readonly string[]).includes(input.kind)) return deny({ code: "CHECKIN_INVALID", field: "kind" });
  const note = input.note?.trim().replace(/\s+/g, " ") || null;
  if (note !== null && note.length > CHECKIN_NOTE_MAX_LENGTH) return deny({ code: "CHECKIN_INVALID", field: "note" });
  return allow({ kind: input.kind as CheckInKind, note });
}
