// KD-02, 03, 04 (slots), 05, 06: what a plan needs before it can be sent.
import { MESSAGE_MAX_LENGTH } from "./config";
import { dayIn, minutesBetween } from "./time";
import { allow, deny, type Decision, type FreeSlot, type Range, type RuleError, type TimeMode, type Zone } from "./types";

export type PlanTimeInput = {
  mode: TimeMode | null;
  start?: Date | null;
  end?: Date | null;
  slots?: readonly FreeSlot[];
};

export type PlanTime =
  | { mode: "set_time"; start: Date; end: Date; slots: [] }
  | { mode: "availability"; start: null; end: null; slots: FreeSlot[] };

/** KD-02, 03, 04: exactly one time mode; the other mode's fields are cleared. */
export function checkTime(input: PlanTimeInput, zone: Zone, now: Date): Decision<PlanTime> {
  if (input.mode === "set_time") {
    const { start, end } = input;
    if (!start || !end) return deny({ code: "NO_TIME", field: "time" });
    const errors: RuleError[] = [];
    if (end <= start) errors.push({ code: "END_BEFORE_START", field: "end" });
    if (start <= now) errors.push({ code: "IN_PAST", field: "start" });
    return errors.length ? deny(...errors) : allow({ mode: "set_time", start, end, slots: [] });
  }
  if (input.mode === "availability") {
    const slots = uniqueSlots(input.slots ?? []);
    if (!slots.length) return deny({ code: "NO_FREE_SLOTS", field: "slots" });
    const today = dayIn(now, zone);
    if (slots.some((s) => s.day < today)) return deny({ code: "IN_PAST", field: "slots" });
    return allow({ mode: "availability", start: null, end: null, slots });
  }
  return deny({ code: "NO_TIME", field: "time" });
}

function uniqueSlots(slots: readonly FreeSlot[]): FreeSlot[] {
  const seen = new Map<string, FreeSlot>();
  for (const s of slots) seen.set(`${s.day}|${s.slot}`, { day: s.day, slot: s.slot });
  return [...seen.values()];
}

/** KD-03: the length shown next to the time, in minutes. */
export function durationMinutes(range: Range): number {
  return minutesBetween(range.start, range.end);
}

/** KD-03: changing the start keeps the length. */
export function moveStart(range: Range, newStart: Date): Range {
  const length = range.end.getTime() - range.start.getTime();
  return { start: newStart, end: new Date(newStart.getTime() + length) };
}

/** KD-05: required, at most 1000 characters. The value is returned exactly as typed (never reworded). */
export function checkMessage(message: string): Decision<string> {
  const trimmed = message.trim();
  if (!trimmed) return deny({ code: "MESSAGE_REQUIRED", field: "message" });
  if (trimmed.length > MESSAGE_MAX_LENGTH) return deny({ code: "MESSAGE_TOO_LONG", field: "message" });
  return allow(message);
}

/** KD-06 */
export function checkInvitees(count: number): Decision {
  return count >= 1 ? allow() : deny({ code: "NO_INVITEES", field: "invitees" });
}

export type PlanInput = PlanTimeInput & { message: string; inviteeCount: number; zone: Zone };

/** Everything a plan needs before Send; returns every error at once so the screen can show them together. */
export function checkPlan(input: PlanInput, now: Date): Decision<{ time: PlanTime; message: string }> {
  const time = checkTime(input, input.zone, now);
  const message = checkMessage(input.message);
  const invitees = checkInvitees(input.inviteeCount);
  if (time.ok && message.ok && invitees.ok) return allow({ time: time.value, message: message.value });
  return deny(...time.errors, ...message.errors, ...invitees.errors);
}

/**
 * KD-06: "Playdate: " + the organizer's child + each invited family's child, joined "A, B & C".
 * Callers pass one first name per family (the first child, Q4 default).
 */
export function playdateTitle(organizerChild: string, inviteeChildren: readonly string[]): string {
  const names = [organizerChild, ...inviteeChildren];
  const last = names.pop();
  const joined = names.length ? `${names.join(", ")} & ${last}` : (last ?? "");
  return `Playdate: ${joined}`;
}
