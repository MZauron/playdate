// Favourites (T18, migration 0009) against the real database. A hearted place keeps only the provider's id (Q6 default); the two
// counting functions are server only and return counts only, from two parents up (Q22); a parent's hearts are theirs alone.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, countAs, enabled, failsAs, failure, q } from "./helpers";

const CHECK = "23514";
const DENIED = "42501";
const users: string[] = [];
async function parent(): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Alex', $2)", [id, `own-${id}`]);
  return id;
}
const heart = (owner: string, placeId: string) =>
  q("insert into saved_places (owner_id, source, provider_place_id, is_favourite) values ($1, 'searched', $2, true)", [owner, placeId]);

afterAll(async () => {
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("saved_places after migration 0009", () => {
  it("a searched place stores the id alone: a name or address next to it is refused; a typed place still needs both", async () => {
    const alex = await parent();
    expect((await failure(q("insert into saved_places (owner_id, source, provider_place_id, name) values ($1, 'searched', 'ChIJ1', 'High Park')", [alex])))?.code).toBe(CHECK);
    expect((await failure(q("insert into saved_places (owner_id, source, provider_place_id, address) values ($1, 'searched', 'ChIJ1', '1 Main')", [alex])))?.code).toBe(CHECK);
    expect(await failure(heart(alex, "ChIJ1"))).toBeNull();
    expect((await failure(q("insert into saved_places (owner_id, source, address) values ($1, 'typed', '1 Main')", [alex])))?.code).toBe(CHECK);
    expect(await failure(q("insert into saved_places (owner_id, source, name, address) values ($1, 'typed', 'Home', '1 Main')", [alex]))).toBeNull();
  });

  it("another parent cannot read your hearts", async () => {
    const alex = await parent();
    const sam = await parent();
    await heart(alex, `ChIJ-${alex}`);
    expect(await countAs({ userId: sam }, `select * from saved_places where owner_id = '${alex}'`)).toBe(0);
    expect(await countAs({ userId: alex }, `select * from saved_places where owner_id = '${alex}'`)).toBe(1);
  });

  it("the counting functions are not callable by anon or a signed-in parent", async () => {
    const alex = await parent();
    for (const sql of ["select * from place_like_counts(array['x'], 1)", "select * from popular_places(1, 10)"]) {
      expect(await failsAs("anon", sql)).toBe(DENIED);
      expect(await failsAs({ userId: alex }, sql)).toBe(DENIED);
    }
  });

  it("counts distinct parents, only from the minimum up, most first", async () => {
    const [a, b, c] = [await parent(), await parent(), await parent()];
    const two = `ChIJtwo-${randomUUID()}`;
    const three = `ChIJthree-${randomUUID()}`;
    const one = `ChIJone-${randomUUID()}`;
    for (const owner of [a, b]) await heart(owner, two);
    for (const owner of [a, b, c]) await heart(owner, three);
    await heart(a, one);
    expect(await q("select * from place_like_counts($1, 2) order by provider_place_id", [[two, three, one]])).toEqual(
      [
        { provider_place_id: three, parents: 3 },
        { provider_place_id: two, parents: 2 },
      ].sort((x, y) => x.provider_place_id.localeCompare(y.provider_place_id)),
    );
    const popular = await q<{ provider_place_id: string; parents: number }>("select * from popular_places(2, 50)");
    const mine = popular.filter((p) => [two, three, one].includes(p.provider_place_id));
    expect(mine).toEqual([
      { provider_place_id: three, parents: 3 },
      { provider_place_id: two, parents: 2 },
    ]);
  });
});

describe.skipIf(!apiEnabled)("favourites repository (T18)", () => {
  let db: typeof import("@/lib/db/favourites");
  beforeAll(async () => {
    db = await import("@/lib/db/favourites");
  });

  it("hearts once, un-hearts, keeps each parent's own, and shows the places looked up", async () => {
    const alex = await parent();
    const sam = await parent();
    await db.favouriteStore.setFavourite(alex, "fake-high-park", true);
    await db.favouriteStore.setFavourite(alex, "fake-high-park", true);
    await db.favouriteStore.setFavourite(alex, "fake-rom", true);
    await db.favouriteStore.setFavourite(sam, "fake-high-park", true);
    expect((await db.favouriteStore.favouriteIds(alex)).sort()).toEqual(["fake-high-park", "fake-rom"]);
    expect(await db.favouriteStore.favouriteIds(sam)).toEqual(["fake-high-park"]);

    const shown = await db.listFavouritePlaces(alex);
    expect(shown.find((p) => p.id === "fake-high-park")).toMatchObject({ name: "High Park", favourite: true });
    expect((await db.favouriteStore.likeCounts(["fake-high-park", "fake-rom"], 2))["fake-high-park"]).toBeGreaterThanOrEqual(2);
    expect((await db.favouriteStore.likeCounts(["fake-rom"], 2))["fake-rom"]).toBeUndefined();

    await db.favouriteStore.setFavourite(sam, "fake-high-park", false);
    expect(await db.favouriteStore.favouriteIds(sam)).toEqual([]);
    expect(await db.favouriteStore.favouriteIds(alex)).toContain("fake-high-park"); // Sam's un-heart leaves Alex's
  });
});
