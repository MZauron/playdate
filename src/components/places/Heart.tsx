"use client";

// The heart (T18) on a place card: tap to keep the place in Your favourites, tap again to let it go. Shows the change at once and
// puts it back if the server says no.
import { useState, useTransition } from "react";
import { heartAction } from "@/app/(app)/places/actions";
import { cx } from "@/components/cx";
import { enCA } from "@/lib/i18n/en-CA";

export function Heart({ placeId, name, initial }: { placeId: string; name: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        aria-pressed={on}
        aria-label={enCA.places.favourite(name)}
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          setFailed(false);
          startTransition(async () => {
            const result = await heartAction(placeId, next).catch(() => ({ ok: false }));
            if (!result.ok) {
              setOn(!next);
              setFailed(true);
            }
          });
        }}
        className={cx(
          "-mr-2 -mt-2 flex size-11 items-center justify-center rounded-full text-2xl leading-none focus-visible:outline-2 focus-visible:outline-primary",
          on ? "text-accent" : "text-muted",
        )}
      >
        <span aria-hidden="true">{on ? "♥" : "♡"}</span>
      </button>
      {failed && (
        <span role="alert" className="text-[13px] text-danger">
          {enCA.places.heartFailed}
        </span>
      )}
    </span>
  );
}
