"use client";

import { useActionState, useState } from "react";
import { answerAction, type AnswerState } from "@/app/r/[token]/actions";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { enCA } from "@/lib/i18n/en-CA";
import { DECLINE_REASONS, NOTE_MAX_LENGTH } from "@/lib/rules/config";
import type { AnswerKind, DeclineReason } from "@/lib/rules/types";

const t = enCA.home.answer;

/**
 * T49 (KD-07 unchanged): Coming / Can't make it on a set-time invite's Home card, for the signed-in invitee. The same action and rules
 * as the invite page (answerAction with the invite id); Can't make it opens the reason chips and the optional note. Teal, not coral:
 * Plan another is Home's one main action.
 */
export function HomeAnswer({
  inviteId,
  timeVersion,
  organizer,
  answer,
  reason: savedReason,
}: {
  inviteId: string;
  timeVersion: number;
  organizer: string;
  answer: AnswerKind | null;
  reason: DeclineReason | null;
}) {
  const [state, action, pending] = useActionState<AnswerState, FormData>(answerAction, {});
  // Open at a count of saved answers: a new answer moves the count on, which shows the saved answer again.
  const answered = state.answered ?? 0;
  const [changingAt, setChangingAt] = useState<number | null>(null);
  const [decliningAt, setDecliningAt] = useState<number | null>(null);
  const [reason, setReason] = useState<DeclineReason | null>(savedReason);
  const [note, setNote] = useState("");
  const changing = changingAt === answered;
  const declining = decliningAt === answered;

  const hidden = (
    <>
      <input type="hidden" name="inviteId" value={inviteId} />
      <input type="hidden" name="timeVersion" value={timeVersion} />
    </>
  );
  const error = state.error && (
    <p role="alert" className="text-[15px] font-medium text-danger">
      {state.error}
    </p>
  );

  if (answer && !changing && !declining) {
    return (
      <div aria-live="polite" className="flex items-center justify-between gap-3">
        <p className={answer === "no" ? "min-w-0 font-semibold text-danger" : "min-w-0 font-semibold text-success"}>
          {answer === "no" ? t.youCant(savedReason ? enCA.reasons[savedReason] : "") : t.youreComing}
        </p>
        <Button compact onClick={() => setChangingAt(answered)} className="shrink-0 whitespace-nowrap px-4">
          {t.change}
        </Button>
      </div>
    );
  }

  if (declining) {
    return (
      <form action={action} aria-label={t.label(organizer)} className="flex flex-col gap-3">
        {hidden}
        <input type="hidden" name="kind" value="no" />
        {reason && <input type="hidden" name="reason" value={reason} />}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[15px] font-semibold">{enCA.invite.reasonLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {DECLINE_REASONS.map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {enCA.reasons[r]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`home-note-${inviteId}`} className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">
            {enCA.invite.noteLabel}
          </label>
          <textarea
            id={`home-note-${inviteId}`}
            name="note"
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-xl bg-card px-4 py-3 text-base text-ink ring-1 ring-border focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        {error}
        <div className="flex gap-2">
          <Button compact onClick={() => setDecliningAt(null)} className="flex-1">
            {t.back}
          </Button>
          <Button type="submit" compact disabled={pending || !reason} className="flex-[2]">
            {t.send}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form action={action} aria-label={t.label(organizer)} className="flex flex-col gap-2">
      {hidden}
      <input type="hidden" name="kind" value="yes" />
      {error}
      <div className="flex gap-2">
        <Button type="submit" compact disabled={pending} className="flex-1">
          {t.coming}
        </Button>
        <Button compact onClick={() => setDecliningAt(answered)} className="flex-1">
          {t.cantMakeIt}
        </Button>
      </div>
    </form>
  );
}
