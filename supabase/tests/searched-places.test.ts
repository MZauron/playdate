// Find a place (T17, migration 0008) against the real database. Q6 default: a searched place keeps only the provider's id; the
// table refuses a name or address next to one. Through the repositories: Send stores the id alone, and the invite page, the
// organizer's page, Home and Send update all show the place by looking it up (fake provider).
import { fakePlaces } from "@/lib/integrations/places/fake";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, enabled, failure, q } from "./helpers";

const CHECK = "23514";
const users: string[] = [];
async function parent(firstName: string): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, firstName, `own-${id}`]);
  await q("insert into children (parent_id, first_name, age_label) values ($1, 'Mia', '5')", [id]);
  return id;
}
async function friend(ownerId: string): Promise<string> {
  const rows = await q<{ id: string }>(
    `insert into friends (owner_id, parent_name, child_first_name, label, phone_hash)
     values ($1, 'Dev Patel', 'Arjun', 'Arjun''s dad', $2) returning id`,
    [ownerId, `h-${randomUUID()}`],
  );
  return rows[0]!.id;
}

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]); // organizers first (see NEXT.md T24)
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("playdates_searched_place_stores_id_only (migration 0008)", () => {
  it("refuses a place name or address next to a provider id, and takes the id alone", async () => {
    const alex = await parent("Alex");
    const insert = (name: string | null, address: string | null) =>
      q(
        `insert into playdates (organizer_id, title, mode, start_at, end_at, message, links_expire_at, place_provider_id, place_name, place_address)
         values ($1, 'Playdate: Mia', 'set_time', now() + interval '1 day', now() + interval '26 hours', 'Park?', now() + interval '2 days', 'ChIJ123', $2, $3)`,
        [alex, name, address],
      );
    expect((await failure(insert("High Park", null)))?.code).toBe(CHECK);
    expect((await failure(insert(null, "1873 Bloor St W")))?.code).toBe(CHECK);
    expect(await failure(insert(null, null))).toBeNull();
  });
});

describe.skipIf(!apiEnabled)("searched places through the repositories (T17)", () => {
  let playdates: typeof import("@/lib/db/playdates");
  let pages: typeof import("@/lib/db/playdate-page");
  let invites: typeof import("@/lib/db/invites");
  let invitePage: typeof import("@/lib/domain/invite-page");
  let domain: typeof import("@/lib/domain/playdates");
  let edit: typeof import("@/lib/domain/edit-playdate");
  beforeAll(async () => {
    playdates = await import("@/lib/db/playdates");
    pages = await import("@/lib/db/playdate-page");
    invites = await import("@/lib/db/invites");
    invitePage = await import("@/lib/domain/invite-page");
    domain = await import("@/lib/domain/playdates");
    edit = await import("@/lib/domain/edit-playdate");
  });

  const NOW = new Date("2030-11-01T12:00:00Z");
  const open = { hit: () => ({ ok: true as const }) };
  const form = { mode: "set_time", day: "2030-11-18", startTime: "10:00", endTime: "12:00", slots: [], zone: "America/Toronto", placeName: "", placeAddress: "", savePlace: false, yourName: "Alex", message: "Park?" };

  it("stores only the id, and every page shows the place by looking it up", async () => {
    const alex = await parent("Alex");
    const dev = await friend(alex);
    const sent = await domain.sendInvite(
      { store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test", places: fakePlaces },
      { id: alex, firstName: "Alex", childFirstName: "Mia" },
      { ...form, friendIds: [dev], placeId: "fake-high-park" },
      NOW,
    );
    if (!sent.ok) throw new Error(JSON.stringify(sent.errors));

    expect(await q("select place_name, place_address, place_provider_id from playdates where id = $1", [sent.playdateId])).toEqual([
      { place_name: null, place_address: null, place_provider_id: "fake-high-park" },
    ]);

    const token = sent.texts[0]!.body.split("/r/")[1]!;
    const view = await invitePage.loadInvite(invites.inviteStore, token, NOW);
    expect(view).toMatchObject({ placeName: "High Park", placeAddress: "1873 Bloor St W, Toronto, ON", placeFacts: { setting: "outdoor" } });

    const organizer = await pages.playdatePageStore.getForOrganizer(alex, sent.playdateId);
    expect(organizer).toMatchObject({ placeName: "High Park", searchedPlace: { id: "fake-high-park" } });
    expect((await playdates.listHomePlaydates(alex, NOW)).find((p) => p.id === sent.playdateId)?.placeName).toBe("High Park");

    // Change place → Riverdale Farm: Updated, still only an id.
    const updated = await edit.sendUpdate(
      { pages: pages.playdatePageStore, playdates: playdates.playdateStore, apply: playdates.applyPlaydateUpdate, limiter: open, linkBase: "https://kindred.test", places: fakePlaces },
      { id: alex, firstName: "Alex", childFirstName: "Mia" },
      sent.playdateId,
      { ...form, friendIds: [dev], placeId: "fake-riverdale-farm" },
      NOW,
    );
    expect(updated).toMatchObject({ ok: true, changed: true, kind: "updated" });
    expect(await q("select place_name, place_provider_id from playdates where id = $1", [sent.playdateId])).toEqual([{ place_name: null, place_provider_id: "fake-riverdale-farm" }]);

    // Back to a typed place: the id goes, the typed name and address are stored.
    await edit.sendUpdate(
      { pages: pages.playdatePageStore, playdates: playdates.playdateStore, apply: playdates.applyPlaydateUpdate, limiter: open, linkBase: "https://kindred.test", places: fakePlaces },
      { id: alex, firstName: "Alex", childFirstName: "Mia" },
      sent.playdateId,
      { ...form, friendIds: [dev], placeId: "", placeName: "Our place", placeAddress: "1 Home St" },
      NOW,
    );
    expect(await q("select place_name, place_address, place_provider_id from playdates where id = $1", [sent.playdateId])).toEqual([
      { place_name: "Our place", place_address: "1 Home St", place_provider_id: null },
    ]);
  });
});
