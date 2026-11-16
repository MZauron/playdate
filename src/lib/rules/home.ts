// KD-13 (Q24, the owner's answer 2026-11-15): Home is ONE list, soonest first. Each playdate on it has one status; the ones that need
// the organizer say why. Over and cancelled playdates leave Home.
import type { AnswerKind, PlaydateStatus, TimeMode } from "./types";

export type HomeStatus =
  /** all_answered: a collecting playdate where every friend answered. times_picked: an availability playdate with ≥ 1 pick.
   * changed_to_no: a confirmed playdate where someone answered Can't make it after it was confirmed. */
  | { kind: "needs_you"; why: "all_answered" | "times_picked" | "changed_to_no" }
  | { kind: "upcoming" }
  | { kind: "waiting" };

export type HomeInput = {
  status: PlaydateStatus;
  mode: TimeMode;
  /** The playdate's end (`playdateEnd` in links.ts). */
  end: Date;
  confirmedAt: Date | null;
  inviteCount: number;
  /** Current answers (this `time_version`), one per invite. */
  answers: readonly { kind: AnswerKind; answeredAt: Date }[];
};

/** null = not on Home (over or cancelled). */
export function homeStatus(input: HomeInput, now: Date): HomeStatus | null {
  if (input.status === "cancelled" || now >= input.end) return null;

  if (input.status === "confirmed") {
    const confirmedAt = input.confirmedAt;
    const declinedSince = confirmedAt !== null && input.answers.some((a) => a.kind === "no" && a.answeredAt > confirmedAt);
    return declinedSince ? { kind: "needs_you", why: "changed_to_no" } : { kind: "upcoming" };
  }

  if (input.inviteCount > 0 && input.answers.length >= input.inviteCount) return { kind: "needs_you", why: "all_answered" };
  if (input.mode === "availability" && input.answers.some((a) => a.kind === "pick")) return { kind: "needs_you", why: "times_picked" };
  return { kind: "waiting" };
}

/**
 * KD-13i: the list's order, for the parent's own playdates and the invites they received alike. A set or confirmed time sorts by its
 * start; a playdate with no time yet (availability) by its end, the last free time it offers; one with neither goes last.
 */
export function homeSortKey(item: { start: Date | null; end: Date | null }): number {
  return (item.start ?? item.end)?.getTime() ?? Number.POSITIVE_INFINITY;
}
