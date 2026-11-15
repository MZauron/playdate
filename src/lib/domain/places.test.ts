// Find a place's search service (T17): the parent's words trimmed, a rate limit per parent, and a provider failure as a code.
import { describe, expect, it } from "vitest";
import { fakePlaces } from "@/lib/integrations/places/fake";
import { searchPlaces } from "./places";

const open = { hit: () => ({ ok: true as const }) };

describe("searchPlaces", () => {
  it("searches the trimmed words; blank words search nothing and cost nothing", async () => {
    const seen: string[] = [];
    const places = { search: async (q: string) => (seen.push(q), fakePlaces.search(q)) };
    let hits = 0;
    const limiter = { hit: () => (hits++, { ok: true as const }) };
    expect(await searchPlaces({ places, limiter }, "p1", "   ")).toEqual({ ok: true, places: [] });
    expect(hits).toBe(0);
    const result = await searchPlaces({ places, limiter }, "p1", "  splash   pads ");
    expect(seen).toEqual(["splash pads"]);
    expect(result.ok && result.places.map((p) => p.id)).toContain("fake-sorauren");
  });
  it("refuses past the limit, and says SEARCH_FAILED when the provider fails", async () => {
    expect(await searchPlaces({ places: fakePlaces, limiter: { hit: () => ({ ok: false, retryAfterSeconds: 30 }) } }, "p1", "parks")).toEqual({
      ok: false,
      code: "TOO_MANY_SEARCHES",
      retryAfterSeconds: 30,
    });
    const logged: string[] = [];
    const down = { search: async () => Promise.reject(new Error("down")) };
    expect(await searchPlaces({ places: down, limiter: open, log: (c) => logged.push(c) }, "p1", "parks")).toEqual({ ok: false, code: "SEARCH_FAILED" });
    expect(logged).toEqual(["search_failed"]);
  });
});
