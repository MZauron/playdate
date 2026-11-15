"use client";

import { useActionState, useState } from "react";
import { confirmAction, type ConfirmState } from "@/app/(app)/playdates/[id]/actions";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { rangeWords } from "@/components/invite/PickAnswer";
import type { PlaydatePageView } from "@/lib/domain/playdate-page";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.playdate;

/**
 * Availability (T14, KD-09, KD-11): Times friends suggested, Most picked on top, with who picked each. Tap one, then Confirm and send
 * update. The server checks the tapped time again (rules/confirm.ts).
 */
export function SuggestedTimes({ playdateId, suggestions, zone }: { playdateId: string; suggestions: PlaydatePageView["suggestions"]; zone: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmAction, {});
  const [chosen, setChosen] = useState<number | null>(suggestions.length === 1 ? 0 : null);
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
      <div role="radiogroup" aria-label={t.suggestedTitle} className="flex flex-col gap-2">
        {suggestions.map((x, i) => {
          const on = chosen === i;
          return (
            <button
              key={x.range.start.toISOString() + x.range.end.toISOString()}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChosen(i)}
              className={cx(
                "flex min-h-14 w-full flex-col rounded-card px-4 py-3 text-left shadow-card focus-visible:outline-2 focus-visible:outline-primary",
                on ? "bg-primary-tint ring-2 ring-primary" : "bg-card",
              )}
            >
              <span className="font-semibold">{rangeWords(x.range, zone)}</span>
              <span className="text-[15px] text-muted">
                {x.names.join(", ")} · {enCA.invite.families(x.families)}
              </span>
              {x.mostPicked && <span className="text-label font-semibold uppercase tracking-wider text-accent">{enCA.invite.mostPicked}</span>}
            </button>
          );
        })}
      </div>
      {state.error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="main" fullWidth disabled={!pick || pending}>
        {t.confirm}
      </Button>
    </form>
  );
}
