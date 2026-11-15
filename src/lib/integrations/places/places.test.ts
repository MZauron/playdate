// The places port (T17): the fake list, the short details cache (Q6), the Google mapping, and showPlace never breaking a page.
import { describe, expect, it } from "vitest";
import { withDetailsCache } from "./cache";
import { fakePlaces } from "./fake";
import { showPlace } from "./index";
import { fromGoogle, livePlaces, type GooglePlace } from "./live";
import type { Place, Places } from "./types";

describe("fakePlaces", () => {
  it("finds places by tag and by the words of their name; empty words find nothing", async () => {
    expect((await fakePlaces.search("Parks")).map((p) => p.id)).toContain("fake-high-park");
    expect((await fakePlaces.search("libraries")).every((p) => p.setting === "indoor")).toBe(true);
    expect((await fakePlaces.search("riverdale")).map((p) => p.name)).toEqual(["Riverdale Farm"]);
    expect(await fakePlaces.search("   ")).toEqual([]);
    expect(await fakePlaces.search("zzzz")).toEqual([]);
  });
  it("gives the details of a known id only, without its search tags", async () => {
    const park = await fakePlaces.details("fake-high-park");
    expect(park).toMatchObject({ id: "fake-high-park", name: "High Park", setting: "outdoor", price: "free" });
    expect(park).not.toHaveProperty("tags");
    expect(await fakePlaces.details("fake-nowhere")).toBeNull();
  });
});

describe("withDetailsCache (Q6: details fetched when shown, with a short cache)", () => {
  it("asks the provider once per id within the cache time, again after it", async () => {
    let calls = 0;
    let now = 0;
    const inner: Places = { search: async () => [], details: async (id) => (calls++, { ...(await fakePlaces.details("fake-high-park"))!, id }) };
    const cached = withDetailsCache(inner, () => now, 1000);
    await cached.details("a");
    await cached.details("a");
    expect(calls).toBe(1);
    now = 1001;
    await cached.details("a");
    expect(calls).toBe(2);
  });
});

describe("showPlace", () => {
  it("falls back to a line and a map link when the provider fails or forgot the place", async () => {
    const failing = { details: async () => Promise.reject(new Error("down")) };
    const gone = await showPlace("ChIJabc", failing);
    expect(gone).toMatchObject({ id: "ChIJabc", name: "The place on the map", address: null });
    expect(gone.mapsUrl).toContain("query_place_id=ChIJabc");
    expect((await showPlace("fake-high-park", fakePlaces)).name).toBe("High Park");
  });
});

describe("Google Places (New)", () => {
  const google: GooglePlace = {
    id: "ChIJ123",
    displayName: { text: "Christie Pits Park" },
    formattedAddress: "750 Bloor St W, Toronto, ON M6G 3K4, Canada",
    types: ["park", "point_of_interest"],
    priceLevel: "PRICE_LEVEL_FREE",
    rating: 4.6,
    nationalPhoneNumber: "(416) 555-0100",
    websiteUri: "https://example.com",
    googleMapsUri: "https://maps.google.com/?cid=1",
  };

  it("maps a place: outdoor from its types, the price level, no ages (Google has none)", () => {
    expect(fromGoogle(google)).toEqual<Place>({
      id: "ChIJ123",
      name: "Christie Pits Park",
      address: "750 Bloor St W, Toronto, ON M6G 3K4, Canada",
      setting: "outdoor",
      ages: null,
      price: "free",
      rating: 4.6,
      phone: "(416) 555-0100",
      website: "https://example.com",
      mapsUrl: "https://maps.google.com/?cid=1",
    });
    expect(fromGoogle({ ...google, types: ["library"] })?.setting).toBe("indoor");
    expect(fromGoogle({ ...google, types: ["zoo"] })?.setting).toBe("both");
    expect(fromGoogle({ ...google, types: ["store"] })?.setting).toBeNull();
    expect(fromGoogle({ id: "x" })).toBeNull();
  });

  it("searches with the key in a header, a field mask and Canada first; 404 details is null; a failure throws", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/places/missing")) return new Response("{}", { status: 404 });
      if (url.includes("/places/broken")) return new Response("{}", { status: 500 });
      if (url.endsWith(":searchText")) return Response.json({ places: [google] });
      return Response.json(google);
    }) as typeof fetch;
    const live = livePlaces("test-key", fetcher);

    expect((await live.search("parks")).map((p) => p.id)).toEqual(["ChIJ123"]);
    const search = calls[0]!;
    const headers = search.init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(headers["X-Goog-FieldMask"]).toContain("places.displayName");
    expect(JSON.parse(String(search.init.body))).toMatchObject({ textQuery: "parks", regionCode: "CA" });
    expect(search.url).not.toContain("test-key");

    expect((await live.details("ChIJ123"))?.name).toBe("Christie Pits Park");
    expect(await live.details("missing")).toBeNull();
    await expect(live.details("broken")).rejects.toThrow(/500/);
  });
});

describe("the quick chips (Q21 default)", () => {
  it("each finds places in the fake list", async () => {
    const { enCA } = await import("@/lib/i18n/en-CA");
    for (const words of enCA.places.quickSearches) expect((await fakePlaces.search(words)).length, words).toBeGreaterThan(0);
  });
});
