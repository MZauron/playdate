// The When step's wall-clock times ("10:00") on the playdate's own clock. The rule decisions come from src/lib/rules; this file only
// turns the pickers' values into what the rules take and back.
import { formatDuration, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import { checkTime, durationMinutes, moveStart } from "@/lib/rules/plan";
import { at } from "@/lib/rules/time";
import type { DaySlot, Decision, FreeSlot, Zone } from "@/lib/rules/types";

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

// --- Share availability (T12): the week grid -------------------------------------------------------------------------------------
// Days are calendar days in the playdate's zone ("2026-11-16"); arithmetic on them uses UTC so no zone can shift a day.

const dayToUtc = (day: string) => new Date(`${day}T00:00:00Z`);
const utcToDay = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  const d = dayToUtc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return utcToDay(d);
}

/** The 7 days shown on one page of the grid, starting at `first`. */
export function weekFrom(first: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Column heading: { weekday: "Mon", date: "16", month: "Nov" }. */
export function dayHeading(day: string): { weekday: string; date: string; month: string } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).formatToParts(dayToUtc(day));
  const part = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { weekday: part("weekday"), date: part("day"), month: part("month") };
}

/** "Mon, Nov 16" for a calendar day. */
export function dayLabel(day: string): string {
  const h = dayHeading(day);
  return `${h.weekday}, ${h.month} ${h.date}`;
}

// --- The faster picker (T31): two weeks of days and one-tap shortcuts. KD-02 and KD-04 are unchanged: the rule still decides on Done.

/** How many days the picker offers, from today. */
export const PICKER_DAYS = 14;

/** Today and the next 13 days. */
export function pickerDays(today: string): string[] {
  return Array.from({ length: PICKER_DAYS }, (_, i) => addDays(today, i));
}

const weekday = (day: string) => dayToUtc(day).getUTCDay(); // 0 = Sunday, 6 = Saturday
const isWeekend = (day: string) => weekday(day) === 0 || weekday(day) === 6;

export type Shortcut = "weekend_mornings" | "weekend_afternoons" | "weekday_afternoons";
export const SHORTCUTS: readonly Shortcut[] = ["weekend_mornings", "weekend_afternoons", "weekday_afternoons"];

/**
 * The slots one shortcut stands for: weekend mornings or afternoons in the two weeks shown, or weekday afternoons in the next 7
 * days ("this week"). Values as the picker holds them, "2026-11-21|morning".
 */
export function shortcutSlots(shortcut: Shortcut, today: string): string[] {
  const days = pickerDays(today);
  if (shortcut === "weekday_afternoons") return days.slice(0, 7).filter((d) => !isWeekend(d)).map((d) => `${d}|afternoon`);
  const slot = shortcut === "weekend_mornings" ? "morning" : "afternoon";
  return days.filter(isWeekend).map((d) => `${d}|${slot}`);
}

/** One tap on a shortcut: adds all its slots, or takes them all off again when every one was already on. */
export function applyShortcut(value: readonly string[], shortcut: Shortcut, today: string): string[] {
  const slots = shortcutSlots(shortcut, today);
  if (slots.length && slots.every((s) => value.includes(s))) return value.filter((v) => !slots.includes(v));
  return [...value, ...slots.filter((s) => !value.includes(s))];
}

/** "2026-11-16|morning" values, as the form posts them, to free slots; sorted by day then slot. */
export function slotValues(values: readonly string[]): FreeSlot[] {
  const order: DaySlot[] = ["morning", "afternoon", "evening"];
  return values
    .map((v) => {
      const [day, slot] = v.split("|") as [string, DaySlot];
      return { day, slot };
    })
    .sort((a, b) => a.day.localeCompare(b.day) || order.indexOf(a.slot) - order.indexOf(b.slot));
}

/** KD-02/KD-04 through the rule, for the grid's Done button: at least one slot, none before today. */
export function checkSlots(values: readonly string[], zone: Zone, now: Date): Decision<FreeSlot[]> {
  const decision = checkTime({ mode: "availability", slots: slotValues(values) }, zone, now);
  if (!decision.ok) return decision;
  return { ok: true, errors: [], value: decision.value.slots };
}
