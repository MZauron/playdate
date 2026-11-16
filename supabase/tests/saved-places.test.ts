// Your saved places (T30) through the repository against the real database: rename and remove reach only the owner's own typed
// places, a name already used (any case) is refused, and searched (hearted) rows are never touched.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, q } from "./helpers";

const users: string[] = [];
async function parent(): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Alex', $2)", [id, `own-${id}`]);
  return id;
}
const typed = async (owner: string, name: string) =>
  (await q<{ id: string }>("insert into saved_places (owner_id, source, name, address) values ($1, 'typed', $2, '1 Main St') returning id", [owner, name]))[0]!.id;

afterAll(async () => {
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!apiEnabled)("saved places repository (T30)", () => {
  let db: typeof import("@/lib/db/playdates");
  beforeAll(async () => {
    db = await import("@/lib/db/playdates");
  });

  it("renames and removes the owner's own typed places only", async () => {
    const alex = await parent();
    const sam = await parent();
    const home = await typed(alex, "Home");
    await typed(alex, "The park");
    const hearted = (await q<{ id: string }>("insert into saved_places (owner_id, source, provider_place_id, is_favourite) values ($1, 'searched', 'fake-rom', true) returning id", [alex]))[0]!.id;

    expect(await db.savedPlaceStore.rename(sam, home, "Mine")).toBe("missing");
    expect(await db.savedPlaceStore.rename(alex, home, "the PARK")).toBe("taken");
    expect(await db.savedPlaceStore.rename(alex, home, "Our house")).toBe("ok");
    expect((await db.listTypedPlaces(alex)).map((p) => p.name).sort()).toEqual(["Our house", "The park"]);

    expect(await db.savedPlaceStore.rename(alex, hearted, "Museum")).toBe("missing");
    expect(await db.savedPlaceStore.remove(alex, hearted)).toBe(false);
    expect(await db.savedPlaceStore.remove(sam, home)).toBe(false);
    expect(await db.savedPlaceStore.remove(alex, home)).toBe(true);
    expect((await db.listTypedPlaces(alex)).map((p) => p.name)).toEqual(["The park"]);
    expect(await q("select count(*)::int as n from saved_places where id = $1", [hearted])).toEqual([{ n: 1 }]);
  });
});
