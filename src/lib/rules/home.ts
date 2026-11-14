// KD-13: which Home section a playdate belongs to.
import type { AnswerKind, PlaydateStatus, TimeMode } from "./types";

export type HomeSection = "needs_you" | "upcoming" | "waiting";

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
export function homeSection(input: HomeInput, now: Date): HomeSection | null {
  if (input.status === "cancelled" || now >= input.end) return null;

  if (input.status === "confirmed") {
    const confirmedAt = input.confirmedAt;
    const declinedSince = confirmedAt !== null && input.answers.some((a) => a.kind === "no" && a.answeredAt > confirmedAt);
    return declinedSince ? "needs_you" : "upcoming";
  }

  const everyoneAnswered = input.inviteCount > 0 && input.answers.length >= input.inviteCount;
  const hasPick = input.mode === "availability" && input.answers.some((a) => a.kind === "pick");
  return everyoneAnswered || hasPick ? "needs_you" : "waiting";
}
