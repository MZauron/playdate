// Shared types for the pure rules (DESIGN.md "Rules"). No I/O, no clock: callers pass `now` and the zone in.

/** Stable error codes. The UI maps each one to copy in `src/lib/i18n/en-CA.ts`. */
export const ERROR_CODES = [
  "NO_TIME", // KD-02
  "NO_FREE_SLOTS", // KD-02
  "END_BEFORE_START", // KD-03
  "IN_PAST", // KD-03, KD-04
  "PICK_OUTSIDE_FREE_SLOT", // KD-04
  "PICK_NOT_HALF_HOUR", // KD-04
  "PICK_TOO_SHORT", // KD-04
  "MESSAGE_REQUIRED", // KD-05
  "MESSAGE_TOO_LONG", // KD-05 (over 1000 characters)
  "NO_INVITEES", // KD-06
  "NO_CHILD", // KD-06 (T41, Q30)
  "INVALID_ANSWER", // KD-07 (answer kind does not fit the mode, missing reason, note on a yes, note too long)
  "PLAYDATE_STARTED", // KD-07
  "PLAYDATE_CANCELLED", // KD-07, KD-09
  "LINK_EXPIRED", // KD-07, KD-14
  "STALE_TIME", // KD-07, KD-10
  "CONFIRM_NEEDS_YES", // KD-09
  "CONFIRM_NEEDS_TIME", // KD-09
  "CHECKIN_CLOSED", // KD-18 (not confirmed, cancelled, or outside the check-in window)
  "CHECKIN_NOT_COMING", // KD-18 (only parents who are coming, and the organizer)
  "CHECKIN_INVALID", // KD-18 (not one of the check-ins, or the note is too long)
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type RuleError = { code: ErrorCode; field?: string };

/** What every rule returns: ok with an optional value, or the errors that stop it. */
export type Decision<T = undefined> =
  | { ok: true; errors: []; value: T }
  | { ok: false; errors: RuleError[] };

export function allow<T>(value: T): Decision<T>;
export function allow(): Decision<undefined>;
export function allow<T>(value?: T): Decision<T | undefined> {
  return { ok: true, errors: [], value };
}

export function deny(...errors: RuleError[]): Decision<never> {
  return { ok: false, errors };
}

/** An IANA zone name, e.g. "America/Toronto" (`playdates.timezone`, KD-16). */
export type Zone = string;

/** A calendar day in the playdate's zone, "YYYY-MM-DD" (`availability_slots.day`). */
export type Day = string;

export type TimeMode = "set_time" | "availability";
export type DaySlot = "morning" | "afternoon" | "evening";
export type PlaydateStatus = "collecting" | "confirmed" | "cancelled";
export type InviteChannel = "app" | "text";
export type InviteLabel = "none" | "updated" | "new_time";
export type AnswerKind = "yes" | "no" | "pick";
export type DeclineReason = "maybe_another_time" | "busy" | "not_feeling_well" | "too_far" | "other_plans";

export type Range = { start: Date; end: Date };
export type FreeSlot = { day: Day; slot: DaySlot };
