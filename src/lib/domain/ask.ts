// Ask Kindred (T18): the parent's words → up to four places from the provider, each with a one-line reason. The provider finds the
// candidates (the parent's words as typed, plus searches for the keywords in them); the AI only chooses among them and says why.
// Without the AI (AI_MODE=fake, no key, or a failure) the keyword fallback picks the first four and says which search found each.
// Pure apart from the ports passed in.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { enCA } from "@/lib/i18n/en-CA";
import type { PlaceIdeas } from "@/lib/integrations/ai/types";
import type { Place, Places } from "@/lib/integrations/places/types";

export const ASK_MAX = 200;
export const ASK_RESULTS = 4;
const CANDIDATES = 12;
const REASON_MAX = 140;

/** 20 questions per parent per 10 minutes: each one is a few provider searches and one AI call. */
export const askLimiter = createRateLimiter({ max: 20, windowMs: 10 * 60 * 1000 });

export const AskRequest = z.object({ words: z.string().max(1000) });

/**
 * The keyword fallback: words a parent might use → what to search for. A word counts when one of the parent's words starts with it
 * ("rainy" → "rain"). Kept short and plain; the provider does the rest with the parent's own words.
 */
export const KEYWORDS: readonly { words: readonly string[]; search: string }[] = [
  { words: ["rain", "indoor", "inside", "cold", "winter", "snow"], search: "indoor play" },
  { words: ["park", "outside", "outdoor", "sunny", "nature", "run", "picnic"], search: "parks" },
  { words: ["playground", "climb", "swing", "slide"], search: "playgrounds" },
  { words: ["book", "library", "libraries", "story", "read", "quiet"], search: "libraries" },
  { words: ["water", "splash", "hot", "summer", "wet"], search: "splash pads" },
  { words: ["museum", "dinosaur", "science", "learn"], search: "museum" },
  { words: ["animal", "farm", "zoo", "goat", "cow"], search: "farm" },
];

export function keywordSearches(words: string): string[] {
  const said = words.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return KEYWORDS.filter((k) => k.words.some((w) => said.some((s) => s.startsWith(w)))).map((k) => k.search);
}

export type AskPick = { place: Place; reason: string };
export type AskResult =
  | { ok: true; picks: AskPick[]; source: "ai" | "built_in" }
  | { ok: false; code: "TOO_MANY_QUESTIONS"; retryAfterSeconds: number }
  | { ok: false; code: "SEARCH_FAILED" };

export type AskDeps = { places: Pick<Places, "search">; ai: PlaceIdeas; limiter: RateLimiter; log?: (code: string) => void };

export async function askKindred(deps: AskDeps, parent: { id: string; childAges: readonly string[] }, input: string): Promise<AskResult> {
  const words = input.trim().replace(/\s+/g, " ").slice(0, ASK_MAX);
  if (!words) return { ok: true, picks: [], source: "built_in" };
  const attempt = deps.limiter.hit(parent.id);
  if (!attempt.ok) return { ok: false, code: "TOO_MANY_QUESTIONS", retryAfterSeconds: attempt.retryAfterSeconds };

  // The keyword searches first (they match what the parent named), then the parent's whole words.
  const searches = [...new Set([...keywordSearches(words), words])].slice(0, 4);
  const found = await Promise.allSettled(searches.map((q) => deps.places.search(q)));
  if (found.every((r) => r.status === "rejected")) {
    deps.log?.("ask_search_failed");
    return { ok: false, code: "SEARCH_FAILED" };
  }
  const candidates: { place: Place; search: string }[] = [];
  found.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    for (const place of r.value) if (!candidates.some((c) => c.place.id === place.id)) candidates.push({ place, search: searches[i]! });
  });
  const pool = candidates.slice(0, CANDIDATES);
  if (!pool.length) return { ok: true, picks: [], source: "built_in" };

  try {
    const chosen = await deps.ai.placeIdeas({
      words,
      childAges: parent.childAges,
      candidates: pool.map(({ place: p }) => ({
        id: p.id,
        name: p.name,
        setting: p.setting,
        ages: p.ages ? enCA.places.ages(p.ages.min, p.ages.max) : null,
        price: p.price,
        rating: p.rating,
      })),
    });
    const picks: AskPick[] = [];
    for (const c of chosen) {
      const place = pool.find((x) => x.place.id === c.id)?.place; // the AI can only pick a candidate, never add a place
      const reason = c.reason.trim();
      if (place && reason && reason.length <= REASON_MAX && !picks.some((p) => p.place.id === place.id)) picks.push({ place, reason });
    }
    if (picks.length) return { ok: true, picks: picks.slice(0, ASK_RESULTS), source: "ai" };
    deps.log?.("ask_ai_empty");
  } catch {
    deps.log?.("ask_ai_failed");
  }
  return {
    ok: true,
    picks: pool.slice(0, ASK_RESULTS).map(({ place, search }) => ({ place, reason: enCA.ask.foundFor(search) })),
    source: "built_in",
  };
}
