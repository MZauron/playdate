// PLACES_MODE=live: Google Places API (New), the Q6 default. Server only; the key never leaves the server. Nothing returned here is
// stored: a playdate keeps only `id` (Q6), and the details are fetched again (through the short cache in index.ts) when shown.
import type { Place, PlacePrice, Places, PlaceSetting } from "./types";

const BASE = "https://places.googleapis.com/v1";
const FIELDS = ["id", "displayName", "formattedAddress", "types", "priceLevel", "rating", "nationalPhoneNumber", "websiteUri", "googleMapsUri"];
const TIMEOUT_MS = 5_000;

/** The part of a Google place this app reads. */
export type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  types?: string[];
  priceLevel?: string;
  rating?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
};

const PRICES: Record<string, PlacePrice> = {
  PRICE_LEVEL_FREE: "free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$",
};

// Google has no indoor/outdoor field; the place types say it for the places parents look for. Anything else shows neither.
const OUTDOOR = new Set(["park", "playground", "dog_park", "beach", "hiking_area", "garden", "botanical_garden", "national_park", "state_park", "campground", "picnic_ground", "farm", "ski_resort"]);
const INDOOR = new Set(["library", "museum", "aquarium", "amusement_center", "bowling_alley", "movie_theater", "art_gallery", "community_center", "indoor_playground", "childrens_camp", "planetarium", "cafe", "restaurant"]);
const BOTH = new Set(["zoo", "amusement_park", "swimming_pool", "water_park", "sports_complex"]);

function setting(types: readonly string[]): PlaceSetting | null {
  if (types.some((t) => BOTH.has(t))) return "both";
  const outdoor = types.some((t) => OUTDOOR.has(t));
  const indoor = types.some((t) => INDOOR.has(t));
  return outdoor && indoor ? "both" : outdoor ? "outdoor" : indoor ? "indoor" : null;
}

export function fromGoogle(g: GooglePlace): Place | null {
  const name = g.displayName?.text?.trim();
  if (!g.id || !name) return null;
  return {
    id: g.id,
    name,
    address: g.formattedAddress ?? null,
    setting: setting(g.types ?? []),
    ages: null,
    price: (g.priceLevel && PRICES[g.priceLevel]) || null,
    rating: typeof g.rating === "number" ? g.rating : null,
    phone: g.nationalPhoneNumber ?? null,
    website: g.websiteUri ?? null,
    mapsUrl: g.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(g.id)}`,
  };
}

export function livePlaces(apiKey: string, fetcher: typeof fetch = fetch): Places {
  const headers = (mask: string) => ({ "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": mask });
  return {
    async search(query) {
      const response = await fetcher(`${BASE}/places:searchText`, {
        method: "POST",
        headers: headers(FIELDS.map((f) => `places.${f}`).join(",")),
        body: JSON.stringify({ textQuery: query, regionCode: "CA", languageCode: "en", pageSize: 8 }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`places search failed: ${response.status}`);
      const body = (await response.json()) as { places?: GooglePlace[] };
      return (body.places ?? []).map(fromGoogle).filter((p): p is Place => p !== null).slice(0, 8);
    },
    async details(id) {
      const response = await fetcher(`${BASE}/places/${encodeURIComponent(id)}?languageCode=en&regionCode=CA`, {
        headers: headers(FIELDS.join(",")),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status === 404 || response.status === 400) return null;
      if (!response.ok) throw new Error(`places details failed: ${response.status}`);
      return fromGoogle((await response.json()) as GooglePlace);
    },
  };
}
