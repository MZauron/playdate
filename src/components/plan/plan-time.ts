// The When step's wall-clock times ("10:00") on the playdate's own clock. The rule decisions come from src/lib/rules; this file only
// turns the pickers' values into what the rules take and back.
import { formatDuration, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import { checkTime, durationMinutes, moveStart } from "@/lib/rules/plan";
import { at } from "@/lib/rules/time";
import type { Decision, Zone } from "@/lib/rules/types";

export const FIRST_TIME = "06:00";
export const LAST_TIME = "22:00";
export const TIME_STEP_MINUTES = 15;
/** The pickers start on a 2-hour playdate in the morning; the parent changes them. */
export const DEFAULT_START = "10:00";
export const DEFAULT_END = "12:00";

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toClock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** "06:00", "06:15" … "22:00". */
export function timeOptions(): string[] {
  const out: string[] = [];
  for (let m = toMinutes(FIRST_TIME); m <= toMinutes(LAST_TIME); m += TIME_STEP_MINUTES) out.push(toClock(m));
  return out;
}

/** "13:30" → "1:30 PM" (the doc's style). */
export function clockLabel(hhmm: string): string {
  const minutes = toMinutes(hhmm);
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

// A fixed UTC day turns clock times into instants without any zone, so moveStart can do the KD-03 arithmetic.
const onReferenceDay = (hhmm: string) => new Date(Date.UTC(2000, 0, 1, 0, toMinutes(hhmm)));

/** KD-03: a new start keeps the length (moveStart). An end past the last option stops at the last option. */
export function endForNewStart(oldStart: string, oldEnd: string, newStart: string): string {
  const moved = moveStart({ start: onReferenceDay(oldStart), end: onReferenceDay(oldEnd) }, onReferenceDay(newStart));
  const end = moved.end.getUTCDate() === 1 ? moved.end.getUTCHours() * 60 + moved.end.getUTCMinutes() : Infinity;
  return toClock(Math.min(end, toMinutes(LAST_TIME)));
}

export type WhenValue = { day: string; start: string; end: string };

/** The pickers' instants in the playdate's zone; null until a day is chosen. */
export function whenRange(value: WhenValue, zone: Zone): { start: Date; end: Date } | null {
  if (!value.day) return null;
  const instant = (hhmm: string) => at(value.day, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)), zone);
  return { start: instant(value.start), end: instant(value.end) };
}

/** KD-02/03 through the rule, for the Done button. The server checks again on Send. */
export function checkWhen(value: WhenValue, zone: Zone, now: Date): Decision<{ start: Date; end: Date }> {
  const range = whenRange(value, zone);
  const decision = checkTime({ mode: "set_time", start: range?.start, end: range?.end }, zone, now);
  if (!decision.ok) return decision;
  if (decision.value.mode !== "set_time") throw new Error("set_time was asked for");
  return { ok: true, errors: [], value: { start: decision.value.start, end: decision.value.end } };
}

/** The folded When step: "Mon, Nov 16 · 10:00 AM to 12:00 PM · 2 hr". */
export function whenSummary(range: { start: Date; end: Date }, zone: Zone): string {
  return `${formatShortDay(range.start, zone)} · ${formatTimeRange(range.start, range.end, zone)} · ${formatDuration(durationMinutes(range))}`;
}

/** The browser's zone: the playdate's zone when it is created (KD-16). */
export function browserZone(): Zone {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
