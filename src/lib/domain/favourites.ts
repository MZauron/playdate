// The heart (T18): a parent's favourite places, "N parents like it" and Popular with parents. The owner is always the signed-in
// parent the caller passes in; a place id from the browser is checked against the provider before it is kept. Only the provider's
// id is stored (Q6 default). Counts are counts only: nobody sees who hearted a place. Pure apart from the ports passed in.
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { PLACE_ID_PATTERN, type Place, type Places } from "@/lib/integrations/places/types";

/** Q22 default: a place counts as liked or popular only once at least two parents hearted it, so no single parent's choice shows. */
export const MIN_PARENTS_SHOWN = 2;
export const POPULAR_LIMIT = 10;

export type FavouriteStore = {
  /** THIS owner's hearted place ids, newest first. */
  favouriteIds(ownerId: string): Promise<string[]>;
  /** Hearts or un-hearts a place for THIS owner. Hearting twice keeps one; un-hearting a place that isn't hearted does nothing. */
  setFavourite(ownerId: string, placeId: string, on: boolean): Promise<void>;
  /** How many parents hearted each of these places, only where at least `min` did. */
  likeCounts(placeIds: readonly string[], min: number): Promise<Record<string, number>>;
  /** The most-hearted places, at least `min` parents each, most first. */
  popular(min: number, limit: number): Promise<{ placeId: string; parents: number }[]>;
};

/** A place as a card shows it to this parent: their heart, and how many parents like it (0 below the Q22 minimum). */
export type PlaceForParent = Place & { favourite: boolean; likes: number };

/** 120 hearts per parent per 10 minutes. */
export const heartLimiter = createRateLimiter({ max: 120, windowMs: 10 * 60 * 1000 });

export type HeartResult = { ok: true } | { ok: false; code: "PLACE_NOT_FOUND" | "TOO_MANY_HEARTS" };

export async function heartPlace(
  deps: { store: FavouriteStore; places: Pick<Places, "details">; limiter: RateLimiter },
  ownerId: string,
  placeId: string,
  on: boolean,
): Promise<HeartResult> {
  if (!PLACE_ID_PATTERN.test(placeId)) return { ok: false, code: "PLACE_NOT_FOUND" };
  if (!deps.limiter.hit(ownerId).ok) return { ok: false, code: "TOO_MANY_HEARTS" };
  // Un-hearting needs no check: it only ever removes this owner's own row.
  if (on && !(await deps.places.details(placeId).catch(() => null))) return { ok: false, code: "PLACE_NOT_FOUND" };
  await deps.store.setFavourite(ownerId, placeId, on);
  return { ok: true };
}

/** Adds this parent's hearts and the like counts to places from the provider. */
export async function forParent(store: FavouriteStore, ownerId: string, places: readonly Place[]): Promise<PlaceForParent[]> {
  if (!places.length) return [];
  const [mine, counts] = await Promise.all([store.favouriteIds(ownerId), store.likeCounts(places.map((p) => p.id), MIN_PARENTS_SHOWN)]);
  const hearted = new Set(mine);
  return places.map((p) => ({ ...p, favourite: hearted.has(p.id), likes: counts[p.id] ?? 0 }));
}
