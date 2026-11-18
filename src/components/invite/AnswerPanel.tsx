"use client";

import { useActionState, useState } from "react";
import { answerAction, type AnswerState } from "@/app/r/[token]/actions";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { StatusLine } from "@/components/StatusLine";
import { enCA } from "@/lib/i18n/en-CA";
import { DECLINE_REASONS, NOTE_MAX_LENGTH } from "@/lib/rules/config";
import type { InviteView } from "@/lib/domain/invite-page";
import type { DeclineReason, FreeSlot } from "@/lib/rules/types";
import { EveryonesPicks, PickChooser, rangeWords } from "./PickAnswer";

const t = enCA.invite;

type CurrentAnswer = InviteView["answer"];

/** Availability (T13): the organizer's free slots and Everyone's picks. */
type Availability = { organizerFirstName: string; zone: string; slots: FreeSlot[]; picks: InviteView["picks"] };

/** "We're in!" or "Can't make it · We're busy then". */
export function answerWords(answer: NonNullable<CurrentAnswer>, zone: string): string {
  if (answer.kind === "no" && answer.reason) return t.yourAnswer(`${t.no} · ${enCA.reasons[answer.reason]}`);
  if (answer.kind === "pick" && answer.pick) return t.yourPick(rangeWords(answer.pick, zone));
  return t.yourAnswer(t.yes);
}

/**
 * KD-07 for a set time: We're in!, or Can't make it with a reason chip and an optional note. After answering: Thanks + Change my
 * answer. The server decides (rules/answers.ts); the page then shows the answer it saved.
 */
/** Which invite this is: the link's token (no account), or the invite id for the signed-in invitee (T15). */
export type InviteKey = { token: string } | { inviteId: string };

export function AnswerPanel({ inviteKey, timeVersion, answer, zone, availability }: { inviteKey: InviteKey; timeVersion: number; answer: CurrentAnswer; zone: string; availability?: Availability }) {
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
      {"token" in inviteKey ? <input type="hidden" name="token" value={inviteKey.token} /> : <input type="hidden" name="inviteId" value={inviteKey.inviteId} />}
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
        <p className={answer.kind === "no" ? "font-medium text-danger" : "font-medium text-success"}>{answerWords(answer, zone)}</p>
        {availability && <EveryonesPicks picks={availability.picks} zone={availability.zone} hidden={hidden} action={action} pending={pending} />}
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
          <label htmlFor="answer-note" className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">
            {t.noteLabel}
          </label>
          <textarea
            id="answer-note"
            name="note"
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-xl bg-card px-4 py-3 text-base text-ink ring-1 ring-border focus-visible:outline-2 focus-visible:outline-primary"
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

  if (availability) {
    return (
      <div className="flex flex-col gap-3">
        {error}
        <PickChooser {...availability} hidden={hidden} action={action} pending={pending} onDecline={() => setDeclining(true)} />
      </div>
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
