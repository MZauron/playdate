// Ask Kindred (T18): candidates come only from the provider; the AI can pick among them and say why, never add a place; without the
// AI the keyword fallback picks the first four and says which search found each.
import { describe, expect, it } from "vitest";
import { fakePlaceIdeas } from "@/lib/integrations/ai/fake";
import type { PlaceIdeas, PlaceIdeasRequest } from "@/lib/integrations/ai/types";
import { fakePlaces } from "@/lib/integrations/places/fake";
import { askKindred, keywordSearches, type AskDeps } from "./ask";

const open = { hit: () => ({ ok: true as const }) };
const parent = { id: "p1", childAges: ["4"] };
const deps = (ai: PlaceIdeas = fakePlaceIdeas, extra: Partial<AskDeps> = {}): AskDeps => ({ places: fakePlaces, ai, limiter: open, ...extra });

describe("keywordSearches", () => {
  it("turns the parent's words into searches", () => {
    expect(keywordSearches("Somewhere indoor for a rainy Saturday")).toEqual(["indoor play"]);
    expect(keywordSearches("a park with a splash pad, it's hot")).toEqual(["parks", "splash pads"]);
    expect(keywordSearches("something fun")).toEqual([]);
  });
});

describe("askKindred", () => {
  it("without the AI: up to four places from the provider, each saying which search found it", async () => {
    const result = await askKindred(deps(), parent, "  somewhere indoor for a rainy day ");
    expect(result).toMatchObject({ ok: true, source: "built_in" });
    if (!result.ok) return;
    expect(result.picks.length).toBeGreaterThan(0);
    expect(result.picks.length).toBeLessThanOrEqual(4);
    expect(result.picks.every((p) => p.place.setting === "indoor")).toBe(true);
    expect(result.picks[0]!.reason).toBe('Found when searching "indoor play".');
  });

  it("with the AI: keeps its order and reasons, drops a place it made up, a repeat or an overlong reason", async () => {
    let seen: PlaceIdeasRequest | null = null;
    const ai: PlaceIdeas = {
      async placeIdeas(request) {
        seen = request;
        return [
          { id: "fake-made-up", reason: "Invented" },
          { id: "fake-kidz-zone", reason: "Small and cosy for toddlers." },
          { id: "fake-kidz-zone", reason: "Again" },
          { id: "fake-playground-paradise", reason: "x".repeat(200) },
          { id: "fake-playground-paradise", reason: " Big climbing frames for a rainy day. " },
        ];
      },
    };
    const result = await askKindred(deps(ai), parent, "indoor play");
    expect(result.ok && result.source).toBe("ai");
    expect(result.ok && result.picks.map((p) => [p.place.id, p.reason])).toEqual([
      ["fake-kidz-zone", "Small and cosy for toddlers."],
      ["fake-playground-paradise", "Big climbing frames for a rainy day."],
    ]);
    // The AI sees the words, the ages and the candidates: no name of a parent or child.
    expect(seen!.childAges).toEqual(["4"]);
    expect(Object.keys(seen!.candidates[0]!).sort()).toEqual(["ages", "id", "name", "price", "rating", "setting"]);
  });

  it("an AI that fails or picks nothing falls back to the keyword picks", async () => {
    const empty: PlaceIdeas = { placeIdeas: async () => [] };
    for (const ai of [empty, fakePlaceIdeas]) expect(await askKindred(deps(ai), parent, "parks")).toMatchObject({ ok: true, source: "built_in" });
  });

  it("blank words ask nothing; no candidates is an empty answer; a provider that fails says so; the limit refuses", async () => {
    let hits = 0;
    const counting = { hit: () => (hits++, { ok: true as const }) };
    expect(await askKindred(deps(undefined, { limiter: counting }), parent, "   ")).toEqual({ ok: true, picks: [], source: "built_in" });
    expect(hits).toBe(0);
    expect(await askKindred(deps(), parent, "zzzz qqqq")).toEqual({ ok: true, picks: [], source: "built_in" });
    const down = { search: async () => Promise.reject(new Error("down")) };
    expect(await askKindred(deps(undefined, { places: down }), parent, "parks")).toEqual({ ok: false, code: "SEARCH_FAILED" });
    const full = { hit: () => ({ ok: false as const, retryAfterSeconds: 60 }) };
    expect(await askKindred(deps(undefined, { limiter: full }), parent, "parks")).toEqual({ ok: false, code: "TOO_MANY_QUESTIONS", retryAfterSeconds: 60 });
  });
});
