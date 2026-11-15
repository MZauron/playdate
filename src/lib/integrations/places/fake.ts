// PLACES_MODE=fake: tests, phone sessions and local development. A fixed list of Toronto places, no network. Ids start with
// "fake-" so they can never be mistaken for a provider's.
import type { Place, Places } from "./types";

type FakePlace = Place & { tags: string[] };

const maps = (name: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, Toronto`)}`;

const PLACES: FakePlace[] = ([
  { id: "fake-high-park", name: "High Park", address: "1873 Bloor St W, Toronto, ON", setting: "outdoor", ages: { min: 0, max: null }, price: "free", rating: 4.7, phone: null, website: null, tags: ["park", "parks", "playground", "outdoor", "zoo", "nature"] },
  { id: "fake-jamie-bell", name: "Jamie Bell Adventure Playground", address: "High Park, 1873 Bloor St W, Toronto, ON", setting: "outdoor", ages: { min: 2, max: 12 }, price: "free", rating: 4.6, phone: null, website: null, tags: ["playground", "playgrounds", "park", "outdoor"] },
  { id: "fake-riverdale-farm", name: "Riverdale Farm", address: "201 Winchester St, Toronto, ON", setting: "outdoor", ages: { min: 0, max: 10 }, price: "free", rating: 4.6, phone: "+1 416-555-0190", website: null, tags: ["farm", "animals", "outdoor", "park"] },
  { id: "fake-christie-pits", name: "Christie Pits Park", address: "750 Bloor St W, Toronto, ON", setting: "outdoor", ages: { min: 0, max: null }, price: "free", rating: 4.5, phone: null, website: null, tags: ["park", "parks", "playground", "splash pad", "outdoor"] },
  { id: "fake-sorauren", name: "Sorauren Park Splash Pad", address: "289 Sorauren Ave, Toronto, ON", setting: "outdoor", ages: { min: 1, max: 8 }, price: "free", rating: 4.4, phone: null, website: null, tags: ["splash pad", "splash", "water", "park", "outdoor"] },
  { id: "fake-toronto-library", name: "Toronto Reference Library", address: "789 Yonge St, Toronto, ON", setting: "indoor", ages: { min: 0, max: null }, price: "free", rating: 4.7, phone: "+1 416-555-0191", website: "https://example.com/library", tags: ["library", "libraries", "books", "story time", "indoor"] },
  { id: "fake-lillian-smith", name: "Lillian H. Smith Library", address: "239 College St, Toronto, ON", setting: "indoor", ages: { min: 0, max: 12 }, price: "free", rating: 4.6, phone: "+1 416-555-0192", website: "https://example.com/lillian-smith", tags: ["library", "libraries", "books", "story time", "indoor"] },
  { id: "fake-playground-paradise", name: "Playground Paradise", address: "33 Esther Shiner Blvd, Toronto, ON", setting: "indoor", ages: { min: 2, max: 12 }, price: "$", rating: 4.3, phone: "+1 416-555-0193", website: "https://example.com/playground-paradise", tags: ["indoor play", "indoor", "playground", "playgrounds", "climbing"] },
  { id: "fake-kidz-zone", name: "Kidz Zone Indoor Play", address: "1220 Sheppard Ave W, Toronto, ON", setting: "indoor", ages: { min: 1, max: 9 }, price: "$$", rating: 4.1, phone: "+1 416-555-0194", website: "https://example.com/kidz-zone", tags: ["indoor play", "indoor", "playground", "birthday"] },
  { id: "fake-rom", name: "Royal Ontario Museum", address: "100 Queens Park, Toronto, ON", setting: "indoor", ages: { min: 3, max: null }, price: "$$$", rating: 4.7, phone: "+1 416-555-0195", website: "https://example.com/rom", tags: ["museum", "museums", "dinosaurs", "indoor"] },
  { id: "fake-science-centre", name: "Ontario Science Centre Kids Space", address: "770 Don Mills Rd, Toronto, ON", setting: "indoor", ages: { min: 2, max: 8 }, price: "$$", rating: 4.5, phone: "+1 416-555-0196", website: "https://example.com/science", tags: ["museum", "science", "indoor"] },
  { id: "fake-centre-island", name: "Centreville Amusement Park", address: "Centre Island, Toronto, ON", setting: "both", ages: { min: 2, max: 12 }, price: "$$", rating: 4.4, phone: "+1 416-555-0197", website: "https://example.com/centreville", tags: ["rides", "amusement", "island", "outdoor", "park"] },
] satisfies Omit<FakePlace, "mapsUrl">[]).map((p) => ({ ...p, mapsUrl: maps(p.name) }));

function strip(fake: FakePlace): Place {
  const place: Place & { tags?: string[] } = { ...fake };
  delete place.tags;
  return place;
}

/** The whole query starts a tag, or every word of it starts a word of the name or of a tag. */
function matches(place: FakePlace, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (place.tags.some((t) => t === q || t.startsWith(q))) return true;
  const words = place.name.toLowerCase().split(/[^a-z0-9]+/);
  // "pads" finds "pad": a trailing s is dropped, so every quick chip (plural) finds its places.
  return q.split(/\s+/).map((w) => (w.length > 3 ? w.replace(/s$/, "") : w)).every((w) => words.some((n) => n.startsWith(w)) || place.tags.some((t) => t.split(" ").some((tw) => tw.startsWith(w))));
}

export const fakePlaces: Places = {
  async search(query) {
    if (!query.trim()) return [];
    return PLACES.filter((p) => matches(p, query)).slice(0, 8).map(strip);
  },
  async details(id) {
    const place = PLACES.find((p) => p.id === id);
    return place ? strip(place) : null;
  },
};
