// Chooses the places provider by env (PLACES_MODE). Live without a key behaves like fake, as the AI does (T08).
import "server-only";
import { env } from "@/env";
import { enCA } from "@/lib/i18n/en-CA";
import { withDetailsCache } from "./cache";
import { fakePlaces } from "./fake";
import { livePlaces } from "./live";
import type { Place, Places } from "./types";

export type { Place, PlacePrice, Places, PlaceSetting } from "./types";
export { PLACE_ID_PATTERN } from "./types";

let chosen: Places | undefined;

export function places(): Places {
  return (chosen ??= withDetailsCache(env.PLACES_MODE === "live" && env.PLACES_API_KEY ? livePlaces(env.PLACES_API_KEY) : fakePlaces));
}

/**
 * A stored place id, ready to show. Never throws: when the provider fails or no longer knows the place, the parent still sees a
 * line and a map link, so a playdate page never breaks because of the provider.
 */
export async function showPlace(id: string, provider: Pick<Places, "details"> = places()): Promise<Place> {
  try {
    const place = await provider.details(id);
    if (place) return place;
  } catch {
    console.warn(`places details_failed`);
  }
  return {
    id,
    name: enCA.places.unavailable,
    address: null,
    setting: null,
    ages: null,
    price: null,
    rating: null,
    phone: null,
    website: null,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enCA.places.unavailable)}&query_place_id=${encodeURIComponent(id)}`,
  };
}
