// Settings the rules use. Changing one here changes it everywhere.
import type { DaySlot, DeclineReason, Zone } from "./types";

/** Used only when a playdate has no zone yet (the schema's default, KD-16). */
export const DEFAULT_ZONE: Zone = "America/Toronto";

/** Q8 default: Morning 9–12, Afternoon 1–4, Evening 4–7, in the playdate's zone. Hours, 24 h clock. */
export const SLOT_HOURS: Record<DaySlot, { start: number; end: number }> = {
  morning: { start: 9, end: 12 },
  afternoon: { start: 13, end: 16 },
  evening: { start: 16, end: 19 },
};

export const SLOT_ORDER: readonly DaySlot[] = ["morning", "afternoon", "evening"];

/** KD-14: a link stays open this long after the playdate's end. */
export const LINK_GRACE_HOURS = 12;

/** T23 (DESIGN.md "Privacy"): this long after a playdate's end, its links are removed and friends' notes deleted. */
export const CLEANUP_AFTER_DAYS = 30;

/** KD-04: picks move in 30-minute steps and last at least 30 minutes. */
export const PICK_STEP_MINUTES = 30;
export const MIN_PICK_MINUTES = 30;

/** KD-05 */
export const MESSAGE_MAX_LENGTH = 1000;

/** KD-07: the optional note with "Can't make it" (`answers.note`, 280 in the schema). */
export const NOTE_MAX_LENGTH = 280;

/** KD-18 (Q27 default): check-ins open 30 minutes before a confirmed playdate starts and close 1 hour after it ends. */
export const CHECKIN_OPENS_BEFORE_MINUTES = 30;
export const CHECKIN_CLOSES_AFTER_MINUTES = 60;
/** KD-18: the optional note on a check-in. */
export const CHECKIN_NOTE_MAX_LENGTH = 80;

/** KD-07: reason chips, in the order shown. Copy lives in en-CA.ts. */
export const DECLINE_REASONS: readonly DeclineReason[] = [
  "maybe_another_time",
  "busy",
  "not_feeling_well",
  "too_far",
  "other_plans",
];
