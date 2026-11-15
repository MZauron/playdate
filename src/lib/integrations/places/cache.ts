// The "short cache" of Q6: place details are fetched when shown, and the same place shown again within a few minutes (Home, then
// the playdate page, then the invite page) is served from memory. In memory only, per server process; nothing is written anywhere.
import type { Place, Places } from "./types";

export const DETAILS_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

export function withDetailsCache(inner: Places, clock: () => number = Date.now, ttlMs = DETAILS_TTL_MS): Places {
  const entries = new Map<string, { at: number; place: Place | null }>();
  return {
    search: (query) => inner.search(query),
    async details(id) {
      const hit = entries.get(id);
      if (hit && clock() - hit.at < ttlMs) return hit.place;
      const place = await inner.details(id);
      entries.delete(id);
      entries.set(id, { at: clock(), place });
      if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!); // the oldest goes first
      return place;
    },
  };
}
