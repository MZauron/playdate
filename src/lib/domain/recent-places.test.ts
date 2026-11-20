import { describe, expect, it } from "vitest";
import { recentPlaces, type VisitedRow } from "./recent-places";

const row = (id: string, day: number, over: Partial<VisitedRow> = {}): VisitedRow => ({
  id,
  startAt: new Date(Date.UTC(2026, 10, day, 15)),
  placeName: null,
  placeAddress: null,
  placeProviderId: null,
  ...over,
});

describe("recentPlaces (T51)", () => {
  it("keeps each place once, at its latest visit, newest first, up to three", () => {
    const rows = [
      row("a", 1, { placeProviderId: "g-park" }),
      row("b", 8, { placeProviderId: "g-park" }),
      row("c", 5, { placeName: "Grandma's", placeAddress: "12 Oak St" }),
      row("d", 3, { placeName: "  grandma's ", placeAddress: "12  oak st" }),
      row("e", 6, { placeName: "Library" }),
      row("f", 2, { placeName: "Pool" }),
    ];
    expect(recentPlaces(rows).map((r) => r.id)).toEqual(["b", "e", "c"]);
  });

  it("skips playdates without a place", () => {
    expect(recentPlaces([row("a", 1), row("b", 2, { placeName: "  " })])).toEqual([]);
  });
});
