"use client";

import { useEffect, useRef, useState } from "react";
import { deleteGroupAction } from "@/app/(app)/friends/groups/actions";
import { Button } from "@/components/Button";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.groups;

/** ⋯ → Delete group, which asks first ("Delete this group?"); Keep group is focused. */
export function DeleteGroup({ groupId }: { groupId: string }) {
  const [menu, setMenu] = useState(false);
  const [asking, setAsking] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!asking) return;
    keep.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setAsking(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asking]);

  return (
    <div className="relative">
      <button type="button" aria-label={t.more} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex size-11 items-center justify-center rounded-full text-2xl leading-none text-ink">
        ⋯
      </button>
      {menu && (
        <div className="absolute right-0 top-12 z-10 w-48 rounded-card bg-card p-2 shadow-card">
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              setAsking(true);
            }}
            className="flex min-h-11 w-full items-center rounded-button px-3 text-left font-semibold text-danger"
          >
            {t.delete}
          </button>
        </div>
      )}
      {asking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => setAsking(false)}>
          <form
            action={deleteGroupAction}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-note"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col gap-3 rounded-card bg-card p-5 shadow-card"
          >
            <input type="hidden" name="groupId" value={groupId} />
            <h2 id="delete-title" className="text-lg font-semibold">
              {t.deleteAsk}
            </h2>
            <p id="delete-note" className="text-muted">
              {t.deleteNote}
            </p>
            <Button ref={keep} fullWidth onClick={() => setAsking(false)}>
              {t.keep}
            </Button>
            <Button type="submit" variant="destructive" fullWidth>
              {t.delete}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
