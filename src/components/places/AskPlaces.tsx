"use client";

// The Ask tab and Explore's search (T18): the same finders as the Plan screen, ending in Plan a playdate here instead of Select.
import { ButtonLink } from "@/components/Button";
import type { PlaceForParent } from "@/lib/domain/favourites";
import { enCA } from "@/lib/i18n/en-CA";
import { AskKindred } from "./AskKindred";
import { FindPlace } from "./FindPlace";

const planHere = (place: PlaceForParent) => (
  <ButtonLink compact href={`/plan?place=${encodeURIComponent(place.id)}`}>
    {enCA.places.planHere}
  </ButtonLink>
);

export function AskPlaces() {
  return <AskKindred action={planHere} />;
}

export function SearchPlaces() {
  return <FindPlace action={planHere} />;
}
