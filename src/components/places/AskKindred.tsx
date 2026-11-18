"use client";

// Ask Kindred (T18): the parent's words → up to four places, each with a one-line reason, from /api/places/ask. Each place gets the
// caller's button: Plan a playdate here on the Ask tab, Select on the Plan screen ("or ask Kindred").
import { useState } from "react";
import { Button } from "@/components/Button";
import type { PlaceForParent } from "@/lib/domain/favourites";
import { enCA } from "@/lib/i18n/en-CA";
import { PlaceCard } from "./PlaceCard";

const t = enCA.ask;

type Asked =
  | { status: "idle" }
  | { status: "asking" }
  | { status: "done"; picks: { place: PlaceForParent; reason: string }[] }
  | { status: "failed"; message: string };

export function AskKindred({ action, onClose }: { action: (place: PlaceForParent) => React.ReactNode; onClose?: () => void }) {
  const [words, setWords] = useState("");
  const [asked, setAsked] = useState<Asked>({ status: "idle" });

  async function ask() {
    if (!words.trim()) return;
    setAsked({ status: "asking" });
    try {
      const response = await fetch("/api/places/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ words }) });
      if (response.status === 429) return setAsked({ status: "failed", message: t.tooMany });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { picks: { place: PlaceForParent; reason: string }[] };
      setAsked({ status: "done", picks: body.picks });
    } catch {
      setAsked({ status: "failed", message: t.failed });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="ask-words" className="text-[12px] font-bold uppercase tracking-wider text-muted">
          {t.label}
        </label>
        <textarea
          id="ask-words"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          placeholder={t.placeholder}
          maxLength={200}
          rows={3}
          className="block w-full rounded-xl bg-card px-4 py-3 text-base text-ink ring-1 ring-border placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
        />
        <Button type="submit" variant="secondary" disabled={asked.status === "asking" || !words.trim()}>
          {t.submit}
        </Button>
      </form>

      <div aria-live="polite" className="flex flex-col gap-3">
        {asked.status === "asking" && <p className="text-[15px] text-muted">{t.asking}</p>}
        {asked.status === "failed" && (
          <p role="alert" className="text-[15px] font-medium text-danger">
            {asked.message}
          </p>
        )}
        {asked.status === "done" && asked.picks.length === 0 && <p className="text-[15px] text-muted">{t.nothing}</p>}
        {asked.status === "done" && asked.picks.length > 0 && (
          <ul aria-label={t.results} className="flex flex-col gap-3">
            {asked.picks.map(({ place, reason }) => (
              <PlaceCard key={place.id} place={place} reason={reason} as="li">
                {action(place)}
              </PlaceCard>
            ))}
          </ul>
        )}
      </div>
      {onClose && (
        <Button compact className="w-fit" onClick={onClose}>
          {enCA.places.close}
        </Button>
      )}
    </div>
  );
}
