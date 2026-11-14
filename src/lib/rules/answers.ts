// KD-04 (picks), KD-07 (answers), KD-08 (status per friend).
import { DECLINE_REASONS, MIN_PICK_MINUTES, NOTE_MAX_LENGTH, PICK_STEP_MINUTES } from "./config";
import { dayIn, isOnStep, minutesBetween, slotRange } from "./time";
import {
  allow,
  deny,
  type AnswerKind,
  type DeclineReason,
  type Decision,
  type FreeSlot,
  type PlaydateStatus,
  type Range,
  type RuleError,
  type TimeMode,
  type Zone,
} from "./types";

/** KD-04: a range in 30-minute steps, at least 30 minutes, inside ONE free slot. Also used for the organizer's own range (KD-09). */
export function checkPick(pick: Range, slots: readonly FreeSlot[], zone: Zone): Decision<Range> {
  const errors: RuleError[] = [];
  if (!isOnStep(pick.start, PICK_STEP_MINUTES, zone) || !isOnStep(pick.end, PICK_STEP_MINUTES, zone)) {
    errors.push({ code: "PICK_NOT_HALF_HOUR", field: "pick" });
  }
  if (minutesBetween(pick.start, pick.end) < MIN_PICK_MINUTES) errors.push({ code: "PICK_TOO_SHORT", field: "pick" });
  const day = dayIn(pick.start, zone);
  const inside = slots.some((s) => {
    if (s.day !== day) return false;
    const r = slotRange(s.day, s.slot, zone);
    return pick.start >= r.start && pick.end <= r.end;
  });
  if (!inside) errors.push({ code: "PICK_OUTSIDE_FREE_SLOT", field: "pick" });
  return errors.length ? deny(...errors) : allow(pick);
}

export type AnswerTarget = {
  status: PlaydateStatus;
  mode: TimeMode;
  timeVersion: number;
  /** When the playdate starts: the final start once confirmed, else the set start; null for an unconfirmed availability playdate. */
  startsAt: Date | null;
  linkExpiresAt: Date;
  slots: readonly FreeSlot[];
  zone: Zone;
};

export type AnswerInput = {
  kind: AnswerKind;
  reason?: DeclineReason | null;
  note?: string | null;
  pick?: Range | null;
  /** The `time_version` the friend saw when answering. */
  timeVersion: number;
};

export type Answer =
  | { kind: "yes"; reason: null; note: null; pick: null }
  | { kind: "no"; reason: DeclineReason; note: string | null; pick: null }
  | { kind: "pick"; reason: null; note: null; pick: Range };

/**
 * KD-07: is this answer accepted now? Changing an answer replaces it, and an answer after
 * confirmation never un-confirms: this rule returns the answer only, never a status (KD-01).
 */
export function checkAnswer(target: AnswerTarget, input: AnswerInput, now: Date): Decision<Answer> {
  if (target.status === "cancelled") return deny({ code: "PLAYDATE_CANCELLED" });
  if (now >= target.linkExpiresAt) return deny({ code: "LINK_EXPIRED" });
  if (target.startsAt && now >= target.startsAt) return deny({ code: "PLAYDATE_STARTED" });
  if (input.timeVersion !== target.timeVersion) return deny({ code: "STALE_TIME" });

  const allowed: AnswerKind[] = target.mode === "set_time" ? ["yes", "no"] : ["pick", "no"];
  if (!allowed.includes(input.kind)) return deny({ code: "INVALID_ANSWER", field: "kind" });

  const note = input.note?.trim() ? input.note : null;
  if (input.kind !== "no" && note !== null) return deny({ code: "INVALID_ANSWER", field: "note" });

  if (input.kind === "yes") return allow({ kind: "yes", reason: null, note: null, pick: null });

  if (input.kind === "no") {
    if (!input.reason || !DECLINE_REASONS.includes(input.reason)) return deny({ code: "INVALID_ANSWER", field: "reason" });
    if (note !== null && note.length > NOTE_MAX_LENGTH) return deny({ code: "INVALID_ANSWER", field: "note" });
    return allow({ kind: "no", reason: input.reason, note, pick: null });
  }

  if (!input.pick) return deny({ code: "INVALID_ANSWER", field: "pick" });
  const pick = checkPick(input.pick, target.slots, target.zone);
  if (!pick.ok) return pick;
  return allow({ kind: "pick", reason: null, note: null, pick: pick.value });
}

export type FriendStatus =
  | { status: "coming" }
  | { status: "responded" }
  | { status: "cant_make_it"; reason: DeclineReason }
  | { status: "waiting" };

/** KD-08: the coloured status line next to each friend. */
export function friendStatus(answer: { kind: AnswerKind; reason: DeclineReason | null } | null): FriendStatus {
  if (!answer) return { status: "waiting" };
  if (answer.kind === "yes") return { status: "coming" };
  if (answer.kind === "pick") return { status: "responded" };
  if (!answer.reason) throw new Error("A 'no' answer always has a reason");
  return { status: "cant_make_it", reason: answer.reason };
}

/** KD-08: "N of M answered". */
export function answeredCount(inviteCount: number, answerCount: number): { answered: number; total: number } {
  return { answered: Math.min(answerCount, inviteCount), total: inviteCount };
}
