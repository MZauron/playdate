"use client";

import { useActionState, useState } from "react";
import { confirmAction, type ConfirmState } from "@/app/(app)/playdates/[id]/actions";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { rangeWords } from "@/components/invite/PickAnswer";
import type { PlaydatePageView } from "@/lib/domain/playdate-page";
import { enCA, formatShortWhen } from "@/lib/i18n/en-CA";
import { preselectedPick } from "@/lib/rules/picks";

const t = enCA.playdate;

/**
 * Availability (T14, KD-09, KD-11; one tap since T44): the times friends suggested as chips, most families first, and the one most
 * families can make already chosen (ties: the earliest). One button confirms it, "Confirm · Sat, Nov 21, 10 to 12"; any other chip
 * is one tap away. The server checks the chosen time again (rules/confirm.ts).
 */
export function SuggestedTimes({ playdateId, suggestions, zone }: { playdateId: string; suggestions: PlaydatePageView["suggestions"]; zone: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmAction, {});
  const best = preselectedPick(suggestions);
  const [chosen, setChosen] = useState<number | null>(best ? suggestions.indexOf(best) : null);
  const pick = chosen === null ? null : suggestions[chosen];

  if (!suggestions.length) return <p className="text-[15px] text-muted">{t.noSuggestions}</p>;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="playdateId" value={playdateId} />
      {pick && (
        <>
          <input type="hidden" name="chosenStart" value={pick.range.start.toISOString()} />
          <input type="hidden" name="chosenEnd" value={pick.range.end.toISOString()} />
        </>
      )}
      <p className="text-label font-semibold uppercase tracking-wider text-muted">{t.suggestedTitle}</p>
      <div role="radiogroup" aria-label={t.suggestedTitle} className="flex flex-wrap gap-2">
        {suggestions.map((x, i) => {
          const on = chosen === i;
          return (
            <button
              key={x.range.start.toISOString() + x.range.end.toISOString()}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t.timeChipLabel(rangeWords(x.range, zone), x.names)}
              onClick={() => setChosen(i)}
              className={cx(
                "min-h-11 rounded-full px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                on ? "bg-primary text-white" : "bg-card text-ink ring-1 ring-border",
              )}
            >
              {t.timeChip(formatShortWhen(x.range.start, x.range.end, zone), x.families)}
            </button>
          );
        })}
      </div>
      {pick && (
        <p className="text-[15px] text-muted">
          {pick.names.join(", ")}
          {pick.mostPicked && <span className="font-semibold text-accent"> · {enCA.invite.mostPicked}</span>}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="main" fullWidth disabled={!pick || pending}>
        {pick ? t.confirmAt(formatShortWhen(pick.range.start, pick.range.end, zone)) : t.confirm}
      </Button>
    </form>
  );
}
