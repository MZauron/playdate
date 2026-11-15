// The heart (T18): an id from the browser is checked before it is kept; un-hearting needs no check; cards get the parent's own
// hearts and the counts (Q22: below two parents, no count).
import { describe, expect, it } from "vitest";
import { fakePlaces } from "@/lib/integrations/places/fake";
import { forParent, heartPlace, MIN_PARENTS_SHOWN, type FavouriteStore } from "./favourites";

function memoryStore() {
  const rows: { ownerId: string; placeId: string }[] = [];
  const store: FavouriteStore = {
    favouriteIds: async (o) => rows.filter((r) => r.ownerId === o).map((r) => r.placeId).reverse(),
    setFavourite: async (o, id, on) => {
      const i = rows.findIndex((r) => r.ownerId === o && r.placeId === id);
      if (on && i < 0) rows.push({ ownerId: o, placeId: id });
      if (!on && i >= 0) rows.splice(i, 1);
    },
    likeCounts: async (ids, min) => {
      const counts: Record<string, number> = {};
      for (const id of ids) {
        const n = new Set(rows.filter((r) => r.placeId === id).map((r) => r.ownerId)).size;
        if (n >= min) counts[id] = n;
      }
      return counts;
    },
    popular: async () => [],
  };
  return { store, rows };
}
const open = { hit: () => ({ ok: true as const }) };

describe("heartPlace", () => {
  it("keeps a real place once, lets it go, and refuses an unknown or malformed id", async () => {
    const { store, rows } = memoryStore();
    const deps = { store, places: fakePlaces, limiter: open };
    expect(await heartPlace(deps, "alex", "fake-high-park", true)).toEqual({ ok: true });
    expect(await heartPlace(deps, "alex", "fake-high-park", true)).toEqual({ ok: true });
    expect(rows).toEqual([{ ownerId: "alex", placeId: "fake-high-park" }]);
    expect(await heartPlace(deps, "alex", "fake-nowhere", true)).toEqual({ ok: false, code: "PLACE_NOT_FOUND" });
    expect(await heartPlace(deps, "alex", "<script>", true)).toEqual({ ok: false, code: "PLACE_NOT_FOUND" });
    expect(await heartPlace(deps, "alex", "fake-high-park", false)).toEqual({ ok: true });
    expect(rows).toEqual([]);
    expect(await heartPlace({ ...deps, limiter: { hit: () => ({ ok: false as const, retryAfterSeconds: 9 }) } }, "alex", "fake-rom", true)).toEqual({ ok: false, code: "TOO_MANY_HEARTS" });
  });
});

describe("forParent", () => {
  it("marks this parent's hearts and shows a count only from two parents (Q22)", async () => {
    const { store } = memoryStore();
    await store.setFavourite("alex", "fake-high-park", true);
    await store.setFavourite("sam", "fake-high-park", true);
    await store.setFavourite("sam", "fake-rom", true);
    const places = await Promise.all(["fake-high-park", "fake-rom"].map(async (id) => (await fakePlaces.details(id))!));
    const shown = await forParent(store, "alex", places);
    expect(MIN_PARENTS_SHOWN).toBe(2);
    expect(shown.map((p) => [p.id, p.favourite, p.likes])).toEqual([
      ["fake-high-park", true, 2],
      ["fake-rom", false, 0],
    ]);
  });
});
