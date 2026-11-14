// Time helpers. The zone is always passed in and the clock never read: callers pass `now`.
import { TZDate } from "@date-fns/tz";
import { SLOT_HOURS } from "./config";
import type { Day, DaySlot, FreeSlot, Range, Zone } from "./types";

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDay(day: Day): [number, number, number] {
  const m = DAY_PATTERN.exec(day);
  if (!m) throw new Error(`Not a day: ${day}`);
  return [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
}

/** The calendar day an instant falls on in a zone. */
export function dayIn(instant: Date, zone: Zone): Day {
  const d = new TZDate(instant, zone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The instant of a wall-clock time on a day in a zone. */
export function at(day: Day, hour: number, minute: number, zone: Zone): Date {
  const [y, mo, d] = parseDay(day);
  return new Date(+TZDate.tz(zone, y, mo, d, hour, minute));
}

/** Start and end of a free slot (Q8 hours) in the playdate's zone. */
export function slotRange(day: Day, slot: DaySlot, zone: Zone): Range {
  const hours = SLOT_HOURS[slot];
  return { start: at(day, hours.start, 0, zone), end: at(day, hours.end, 0, zone) };
}

/** The end of the latest free slot, or null when there are none. */
export function lastSlotEnd(slots: readonly FreeSlot[], zone: Zone): Date | null {
  let last: Date | null = null;
  for (const s of slots) {
    const { end } = slotRange(s.day, s.slot, zone);
    if (!last || end > last) last = end;
  }
  return last;
}

export function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 60_000;
}

/** True when the instant is on a whole step of minutes on the wall clock of the zone (e.g. :00 or :30). */
export function isOnStep(instant: Date, stepMinutes: number, zone: Zone): boolean {
  const d = new TZDate(instant, zone);
  return d.getSeconds() === 0 && d.getMilliseconds() === 0 && d.getMinutes() % stepMinutes === 0;
}

export function sameRange(a: Range, b: Range): boolean {
  return a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime();
}
