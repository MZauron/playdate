"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { enCA } from "@/lib/i18n/en-CA";
import { deleteAccountAction, type DeleteAccountState } from "./actions";

const t = enCA.privacy;

/** Delete my account asks first, like Cancel playdate (KD-15): Keep my account is the safe, focused choice. */
export function DeleteAccountButton() {
  const [asking, setAsking] = useState(false);
  const [state, action, pending] = useActionState<DeleteAccountState, FormData>(deleteAccountAction, {});
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
        {t.deleteButton}
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
            aria-labelledby="delete-title"
            aria-describedby="delete-note"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col gap-3 rounded-card bg-card p-5 shadow-card"
          >
            <h2 id="delete-title" className="text-lg font-semibold">
              {t.deleteAsk}
            </h2>
            <p id="delete-note" className="text-muted">
              {t.deleteAskNote}
            </p>
            <Button ref={keep} fullWidth onClick={() => setAsking(false)}>
              {t.keepAccount}
            </Button>
            <Button type="submit" variant="destructive" fullWidth disabled={pending}>
              {t.deleteButton}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
