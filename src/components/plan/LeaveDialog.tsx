"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/Button";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.plan;

/** Back with a plan half done: "Leave this playdate?" Keep planning / Discard. */
export function LeaveDialog({ onKeep, onDiscard }: { onKeep: () => void; onDiscard: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keep.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onKeep();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKeep]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onKeep}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        aria-describedby="leave-note"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-card bg-card p-5 shadow-card"
      >
        <h2 id="leave-title" className="text-lg font-semibold">
          {t.leaveTitle}
        </h2>
        <p id="leave-note" className="text-muted">
          {t.leaveNote}
        </p>
        <Button ref={keep} variant="main" fullWidth onClick={onKeep}>
          {t.keepPlanning}
        </Button>
        <Button variant="destructive" fullWidth onClick={onDiscard}>
          {t.discard}
        </Button>
      </div>
    </div>
  );
}
