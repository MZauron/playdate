"use client";

import { useState } from "react";
import { enCA } from "@/lib/i18n/en-CA";
import { MESSAGE_MAX_LENGTH } from "@/lib/rules/config";
import { browserZone } from "./plan-time";

const t = enCA.plan;

export type PlanForIdeas = { friendIds: string[]; day: string; startTime: string; endTime: string; placeName: string };

/** Message to the parents (KD-05: required). ✨ Suggestions only fills the box; the parent edits and sends their own words. */
export function MessageField({ value, onChange, error, plan }: { value: string; onChange: (value: string) => void; error?: string; plan: PlanForIdeas }) {
  const [ideas, setIdeas] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  async function fetchIdeas(nextRound: number) {
    setLoading(true);
    setIdeasError(null);
    try {
      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...plan, zone: browserZone(), round: nextRound, avoid: ideas }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { ideas: string[] };
      setIdeas(body.ideas);
      setRound(nextRound);
    } catch {
      setIdeasError(t.errors.SUGGESTIONS_FAILED);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="message" className="block text-[15px] font-semibold">
        {t.messageLabel}
      </label>
      <textarea
        id="message"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.messagePlaceholder}
        maxLength={MESSAGE_MAX_LENGTH}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "message-error" : undefined}
        className="block w-full rounded-button bg-card px-4 py-3 text-base text-ink ring-1 ring-black/10 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary aria-[invalid=true]:ring-danger"
      />
      {error && (
        <p id="message-error" role="alert" className="text-[15px] font-medium text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => fetchIdeas(ideas.length ? round + 1 : round)}
          className="inline-flex min-h-11 items-center rounded-button bg-purple/10 px-4 text-[15px] font-semibold text-purple disabled:opacity-50"
        >
          {ideas.length ? t.newIdeas : t.suggestions}
        </button>
      </div>
      {ideasError && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {ideasError}
        </p>
      )}
      {ideas.length > 0 && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-[15px] text-muted">{t.suggestionsHint}</p>
          {ideas.map((idea) => (
            <button
              key={idea}
              type="button"
              aria-label={t.useSuggestion(idea)}
              onClick={() => onChange(idea)}
              className="min-h-11 rounded-card bg-card px-4 py-3 text-left text-[15px] shadow-card ring-1 ring-purple/30 focus-visible:outline-2 focus-visible:outline-purple"
            >
              {idea}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
