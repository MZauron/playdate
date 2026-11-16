"use client";

import { useState, useTransition } from "react";
import { removePlaceAction, renamePlaceAction } from "@/app/(app)/places/actions";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import type { SavedPlaceResult } from "@/lib/domain/saved-places";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.explore;

export type SavedPlaceRow = { id: string; name: string; address: string };

/** Your saved places (T30, Q14): each typed place with Rename and Remove. Remove asks first; Keep is the safe choice. */
export function SavedPlaces({ places }: { places: SavedPlaceRow[] }) {
  if (places.length === 0) return <p className="text-[15px] text-muted">{t.noSaved}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {places.map((p) => (
        <SavedPlaceItem key={p.id} place={p} />
      ))}
    </ul>
  );
}

function SavedPlaceItem({ place }: { place: SavedPlaceRow }) {
  const [mode, setMode] = useState<"view" | "rename" | "remove">("view");
  const [name, setName] = useState(place.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<SavedPlaceResult>) =>
    start(async () => {
      setError(null);
      try {
        const result = await action();
        if (result.ok) setMode("view");
        else setError(t.savedErrors[result.code]);
      } catch {
        setError(t.savedErrors.FAILED);
      }
    });

  return (
    <li>
      <Card className="flex flex-col gap-3">
        {mode === "rename" ? (
          <Field id={`rename-${place.id}`} label={t.renameLabel(place.name)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" />
        ) : (
          <div className="min-w-0">
            <p className="font-semibold">{place.name}</p>
            <p className="text-[15px] text-muted">{place.address}</p>
          </div>
        )}
        {mode === "remove" && <p className="font-medium">{t.removeAsk(place.name)}</p>}
        {error && (
          <p role="alert" className="text-[15px] font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {mode === "view" && (
            <>
              <Button compact onClick={() => (setName(place.name), setMode("rename"))}>
                {t.rename}
              </Button>
              <Button compact variant="destructive" onClick={() => setMode("remove")}>
                {t.remove}
              </Button>
            </>
          )}
          {mode === "rename" && (
            <>
              <Button compact disabled={pending} onClick={() => run(() => renamePlaceAction(place.id, name))}>
                {t.save}
              </Button>
              <Button compact variant="secondary" onClick={() => (setError(null), setMode("view"))}>
                {t.cancel}
              </Button>
            </>
          )}
          {mode === "remove" && (
            <>
              <Button compact autoFocus onClick={() => (setError(null), setMode("view"))}>
                {t.keep}
              </Button>
              <Button compact variant="destructive" disabled={pending} onClick={() => run(() => removePlaceAction(place.id))}>
                {t.remove}
              </Button>
            </>
          )}
        </div>
      </Card>
    </li>
  );
}
