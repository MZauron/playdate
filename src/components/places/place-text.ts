// The one-line facts under a place's name: "Outdoor · Ages 2–12 · Free · ★ 4.6". Only what the provider says; nothing is guessed.
import type { Place } from "@/lib/integrations/places/types";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.places;

export function placeFacts(place: Pick<Place, "setting" | "ages"> & Partial<Pick<Place, "price" | "rating">>): string {
  return [
    place.setting && t.setting[place.setting],
    place.ages && t.ages(place.ages.min, place.ages.max),
    place.price && t.price[place.price],
    place.rating !== null && place.rating !== undefined && t.rating(place.rating),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A `tel:` link from the provider's number ("+1 416-555-0190", "(416) 555-0190"). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
