// From MZauron/aquatix src/platform/rate-limit.ts @ 4a87d68
// A small in-memory rate limit: at most `max` tries per `windowMs` for one key (an address, a parent, a phone). It lives in this
// process's memory: the app runs as ONE Railway service, so that is every request; a restart forgets it, which only ever errs on
// the side of letting someone through. Pure apart from the clock that is passed in.
//
// It is the outer fence, not the rule: what a parent may do is still decided by the rules and the database.

export interface RateLimiter {
  /** Counts one try for `key`. `ok: false` when it is over the limit, with the seconds until the oldest try leaves the window. */
  hit(key: string): { ok: true } | { ok: false; retryAfterSeconds: number };
}

export function createRateLimiter(options: { max: number; windowMs: number; now?: () => number; /** Keys kept at most (the oldest are dropped): a flood of addresses cannot grow memory without bound. */ maxKeys?: number }): RateLimiter {
  const now = options.now ?? Date.now;
  const maxKeys = options.maxKeys ?? 5_000;
  const hits = new Map<string, number[]>();
  return {
    hit(key) {
      const at = now();
      const recent = (hits.get(key) ?? []).filter((t) => at - t < options.windowMs);
      if (recent.length >= options.max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((options.windowMs - (at - recent[0]!)) / 1000)) };
      }
      recent.push(at);
      // Re-insert so the map keeps the most recently seen keys last, then drop the oldest when there are too many.
      hits.delete(key);
      hits.set(key, recent);
      while (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
      return { ok: true };
    },
  };
}

/** The visitor's address as the proxy in front of the app reports it (Railway sets `x-forwarded-for`: the first entry is the client). */
export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
