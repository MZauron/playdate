// Find a place (T17): the parent's words → places from the provider (Q6 default: Google Places). The words are the parent's own;
// nothing about them (no name, no child, no friend) goes with them. Pure apart from the ports passed in.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import type { Place, Places } from "@/lib/integrations/places/types";

export const SEARCH_MAX = 80;

/** 40 searches per parent per 10 minutes: plenty for typing and chips, few enough to keep the provider's bill small. */
export const placeSearchLimiter = createRateLimiter({ max: 40, windowMs: 10 * 60 * 1000 });

export const PlaceSearchRequest = z.object({ query: z.string().max(200) });

export type PlaceSearchResult =
  | { ok: true; places: Place[] }
  | { ok: false; code: "TOO_MANY_SEARCHES"; retryAfterSeconds: number }
  | { ok: false; code: "SEARCH_FAILED" };

export async function searchPlaces(
  deps: { places: Pick<Places, "search">; limiter: RateLimiter; log?: (code: string) => void },
  parentId: string,
  query: string,
): Promise<PlaceSearchResult> {
  const words = query.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX);
  if (!words) return { ok: true, places: [] };
  const attempt = deps.limiter.hit(parentId);
  if (!attempt.ok) return { ok: false, code: "TOO_MANY_SEARCHES", retryAfterSeconds: attempt.retryAfterSeconds };
  try {
    return { ok: true, places: await deps.places.search(words) };
  } catch {
    deps.log?.("search_failed");
    return { ok: false, code: "SEARCH_FAILED" };
  }
}
