"use client";

import { useActionState, useState } from "react";
import { answerAction, type AnswerState } from "@/app/r/[token]/actions";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { StatusLine } from "@/components/StatusLine";
import { enCA } from "@/lib/i18n/en-CA";
import { DECLINE_REASONS, NOTE_MAX_LENGTH } from "@/lib/rules/config";
import type { AnswerKind, DeclineReason } from "@/lib/rules/types";

const t = enCA.invite;

type CurrentAnswer = { kind: AnswerKind; reason: DeclineReason | null; note: string | null } | null;

/** "We're in!" or "Can't make it · We're busy then". */
export function answerWords(answer: NonNullable<CurrentAnswer>): string {
  if (answer.kind === "no" && answer.reason) return `${t.no} · ${enCA.reasons[answer.reason]}`;
  return t.yes;
}

/**
 * KD-07 for a set time: We're in!, or Can't make it with a reason chip and an optional note. After answering: Thanks + Change my
 * answer. The server decides (rules/answers.ts); the page then shows the answer it saved.
 */
export function AnswerPanel({ token, timeVersion, answer }: { token: string; timeVersion: number; answer: CurrentAnswer }) {
  const [state, action, pending] = useActionState<AnswerState, FormData>(answerAction, {});
  const [changing, setChanging] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<DeclineReason | null>(answer?.kind === "no" ? answer.reason : null);
  const [note, setNote] = useState(answer?.note ?? "");
  const [answeredAt, setAnsweredAt] = useState(state.answered ?? 0);

  // A new saved answer closes the form again (the page has re-read it from the server).
  if ((state.answered ?? 0) !== answeredAt) {
    setAnsweredAt(state.answered ?? 0);
    setChanging(false);
    setDeclining(false);
  }

  const hidden = (
    <>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="timeVersion" value={timeVersion} />
    </>
  );
  const error = state.error && (
    <p role="alert" className="text-[15px] font-medium text-danger">
      {state.error}
    </p>
  );

  if (answer && !changing) {
    return (
      <section aria-live="polite" className="flex flex-col gap-3">
        <StatusLine tone="success" className="text-lg font-semibold">
          {t.thanks}
        </StatusLine>
        <p className={answer.kind === "no" ? "font-medium text-danger" : "font-medium text-success"}>{t.yourAnswer(answerWords(answer))}</p>
        {error}
        <Button fullWidth onClick={() => setChanging(true)}>
          {t.change}
        </Button>
      </section>
    );
  }

  if (declining) {
    return (
      <form action={action} className="flex flex-col gap-4">
        {hidden}
        <input type="hidden" name="kind" value="no" />
        {reason && <input type="hidden" name="reason" value={reason} />}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-semibold">{t.reasonLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {DECLINE_REASONS.map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {enCA.reasons[r]}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="answer-note" className="mb-1.5 block text-[15px] font-semibold">
            {t.noteLabel}
          </label>
          <textarea
            id="answer-note"
            name="note"
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-button bg-card px-4 py-3 text-base text-ink ring-1 ring-black/10 focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        {error}
        <Button type="submit" variant="main" fullWidth disabled={pending || !reason}>
          {t.sendNo}
        </Button>
        <Button fullWidth onClick={() => setDeclining(false)}>
          {t.back}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {hidden}
      <input type="hidden" name="kind" value="yes" />
      {error}
      <Button type="submit" variant="main" fullWidth disabled={pending}>
        {t.yes}
      </Button>
      <Button fullWidth onClick={() => setDeclining(true)}>
        {t.no}
      </Button>
    </form>
  );
}
