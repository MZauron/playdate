"use client";

// Find a place (T17): a search box and quick chips (Q21 default), results from /api/places/search with the heart (T18). Each result
// gets the caller's button: Select on the Plan screen, Plan a playdate here in Explore. Only the parent's words go with the search.
import { useState } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import type { PlaceForParent } from "@/lib/domain/favourites";
import { enCA } from "@/lib/i18n/en-CA";
import { PlaceCard } from "./PlaceCard";

const t = enCA.places;

type Found = { status: "idle" } | { status: "searching" } | { status: "done"; places: PlaceForParent[] } | { status: "failed" };

export function FindPlace({ action, onClose }: { action: (place: PlaceForParent) => React.ReactNode; onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found>({ status: "idle" });

  async function search(words: string) {
    if (!words.trim()) return;
    setFound({ status: "searching" });
    try {
      const response = await fetch("/api/places/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: words }) });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { places: PlaceForParent[] };
      setFound({ status: "done", places: body.places });
    } catch {
      setFound({ status: "failed" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <label htmlFor="place-search" className="sr-only">
          {t.searchLabel}
        </label>
        <input
          id="place-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          maxLength={80}
          autoComplete="off"
          enterKeyHint="search"
          className="h-[50px] min-w-0 flex-1 rounded-button bg-card px-4 text-base text-ink ring-1 ring-black/10 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-primary"
        />
        <Button type="submit" disabled={found.status === "searching"}>
          {t.search}
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {t.quickSearches.map((words) => (
          <Chip
            key={words}
            selected={query === words}
            onClick={() => {
              setQuery(words);
              void search(words);
            }}
          >
            {words}
          </Chip>
        ))}
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {found.status === "searching" && <p className="text-[15px] text-muted">{t.searching}</p>}
        {found.status === "failed" && (
          <p role="alert" className="text-[15px] font-medium text-danger">
            {t.searchFailed}
          </p>
        )}
        {found.status === "done" && found.places.length === 0 && <p className="text-[15px] text-muted">{t.noResults}</p>}
        {found.status === "done" && found.places.length > 0 && (
          <ul aria-label={t.searchLabel} className="flex flex-col gap-3">
            {found.places.map((place) => (
              <PlaceCard key={place.id} place={place} as="li">
                {action(place)}
              </PlaceCard>
            ))}
          </ul>
        )}
      </div>

      {onClose && (
        <>
          <p className="text-[15px] text-muted">{t.typeInstead}</p>
          <Button compact className="w-fit" onClick={onClose}>
            {t.close}
          </Button>
        </>
      )}
    </div>
  );
}
