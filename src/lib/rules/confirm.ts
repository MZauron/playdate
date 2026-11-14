// KD-09: what the final time is when the organizer taps Confirm and send update (KD-01: only then).
import { checkPick } from "./answers";
import { sameRange } from "./time";
import { allow, deny, type AnswerKind, type Decision, type FreeSlot, type PlaydateStatus, type Range, type TimeMode, type Zone } from "./types";

export type ConfirmInput = {
  status: PlaydateStatus;
  mode: TimeMode;
  /** The set time (set_time mode). */
  setTime: Range | null;
  /** Current answers (this `time_version`). */
  answers: readonly { kind: AnswerKind; pick: Range | null }[];
  slots: readonly FreeSlot[];
  zone: Zone;
  /** Availability: the pick or own range the organizer chose. */
  chosen?: Range | null;
};

/** Returns the final range. The caller sets status confirmed with it. */
export function checkConfirm(input: ConfirmInput): Decision<Range> {
  if (input.status === "cancelled") return deny({ code: "PLAYDATE_CANCELLED" });

  if (input.mode === "set_time") {
    if (!input.setTime) return deny({ code: "CONFIRM_NEEDS_TIME" });
    if (!input.answers.some((a) => a.kind === "yes")) return deny({ code: "CONFIRM_NEEDS_YES" });
    return allow(input.setTime);
  }

  const chosen = input.chosen;
  if (!chosen) return deny({ code: "CONFIRM_NEEDS_TIME" });
  const isSuggested = input.answers.some((a) => a.kind === "pick" && a.pick && sameRange(a.pick, chosen));
  if (isSuggested) return allow(chosen);
  return checkPick(chosen, input.slots, input.zone);
}
