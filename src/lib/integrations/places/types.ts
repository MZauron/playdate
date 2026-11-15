// The places port (CLAUDE.md "Integrations", T17). Q6 default: Google Places (New). Kindred keeps only the provider's place id;
// everything else here is fetched when it is shown, on the server, and never written to the database.

export type PlaceSetting = "indoor" | "outdoor" | "both";
export type PlacePrice = "free" | "$" | "$$" | "$$$";

export type Place = {
  /** The provider's place id: the one thing a playdate stores (`playdates.place_provider_id`). */
  id: string;
  name: string;
  address: string | null;
  setting: PlaceSetting | null;
  /** Ages the place suits, when the provider says (Google does not; the fake does). */
  ages: { min: number; max: number | null } | null;
  price: PlacePrice | null;
  /** 1.0–5.0, or null when the place has no rating. */
  rating: number | null;
  /** For a `tel:` link, as the provider gives it. */
  phone: string | null;
  website: string | null;
  /** Directions: the provider's own map link. */
  mapsUrl: string;
};

export type Places = {
  /** Up to 8 places for the parent's words, best first. Throws when the provider fails; callers answer with a short error. */
  search(query: string): Promise<Place[]>;
  /** One place by id, or null when the provider has no such place. Throws when the provider fails. */
  details(id: string): Promise<Place | null>;
};

/** Provider place ids are opaque; this is only a sanity check on what a form sends (Google ids are base64url-ish). */
export const PLACE_ID_PATTERN = /^[A-Za-z0-9_:-]{1,300}$/;
