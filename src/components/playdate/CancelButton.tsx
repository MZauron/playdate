"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cancelAction, type ConfirmState } from "@/app/(app)/playdates/[id]/actions";
import { Button } from "@/components/Button";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.playdate;

/** KD-15 (Q1 default): Cancel playdate asks first. Keep playdate is the safe, focused choice. */
export function CancelButton({ playdateId }: { playdateId: string }) {
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState<ConfirmState, FormData>(cancelAction, {});
  const keep = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!asking) return;
    keep.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setAsking(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asking]);

  return (
    <>
      <Button variant="destructive" fullWidth onClick={() => setAsking(true)}>
        {t.cancel}
      </Button>
      {state.error && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {state.error}
        </p>
      )}
      {asking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => setAsking(false)}>
          <form
            action={action}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            aria-describedby="cancel-note"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col gap-3 rounded-card bg-card p-5 shadow-card"
          >
            <input type="hidden" name="playdateId" value={playdateId} />
            <h2 id="cancel-title" className="text-lg font-semibold">
              {t.cancelAsk}
            </h2>
            <p id="cancel-note" className="text-muted">
              {t.cancelNote}
            </p>
            <Button ref={keep} fullWidth onClick={() => setAsking(false)}>
              {t.keepPlaydate}
            </Button>
            <Button type="submit" variant="destructive" fullWidth disabled={pending}>
              {t.cancel}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
