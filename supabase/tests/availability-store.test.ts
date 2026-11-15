// Share availability against the real database (migration 0005): Send writes the free slots with the playdate, Send update rewrites
// them, and switching to a set time clears them (KD-02). Through the local Supabase API (scripts/test-db.sh).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, q } from "./helpers";

const users: string[] = [];
async function parent(): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Alex', $2)", [id, `own-${id}`]);
  await q("insert into children (parent_id, first_name, age_label) values ($1, 'Mia', '5')", [id]);
  return id;
}
async function friend(ownerId: string): Promise<string> {
  const rows = await q<{ id: string }>(
    `insert into friends (owner_id, parent_name, child_first_name, label, phone_e164, phone_hash)
     values ($1, 'Dev Patel', 'Arjun', 'Arjun''s dad', $2, $3) returning id`,
    [ownerId, `+1416555${Math.floor(1000 + Math.random() * 8999)}`, `h-${randomUUID()}`],
  );
  return rows[0]!.id;
}

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]); // organizers first (see NEXT.md T24)
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!apiEnabled)("Share availability against the database", () => {
  let playdates: typeof import("@/lib/db/playdates");
  let pages: typeof import("@/lib/db/playdate-page");
  let sendInvite: typeof import("@/lib/domain/playdates").sendInvite;
  let sendUpdate: typeof import("@/lib/domain/edit-playdate").sendUpdate;
  beforeAll(async () => {
    playdates = await import("@/lib/db/playdates");
    pages = await import("@/lib/db/playdate-page");
    ({ sendInvite } = await import("@/lib/domain/playdates"));
    ({ sendUpdate } = await import("@/lib/domain/edit-playdate"));
  });

  const NOW = new Date("2030-11-01T12:00:00Z");
  const open = { hit: () => ({ ok: true as const }) };
  const base = { mode: "availability", day: "", startTime: "", endTime: "", zone: "America/Toronto", placeName: "", placeAddress: "", savePlace: false, yourName: "Alex", message: "Which works?" };
  const slotsOf = (id: string) => q<{ day: string; slot: string }>("select to_char(day, 'YYYY-MM-DD') as day, slot::text from availability_slots where playdate_id = $1 order by day, slot", [id]);

  it("Send writes the slots with the playdate, no start or end, and links until the last slot + 12 h", async () => {
    const alex = await parent();
    const f = await friend(alex);
    const sent = await sendInvite({ store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test" }, { id: alex, firstName: "Alex", childFirstName: "Mia" }, { ...base, friendIds: [f], slots: ["2030-11-18|morning", "2030-11-20|evening"] }, NOW);
    if (!sent.ok) throw new Error(JSON.stringify(sent.errors));
    expect(await slotsOf(sent.playdateId)).toEqual([{ day: "2030-11-18", slot: "morning" }, { day: "2030-11-20", slot: "evening" }]);
    expect(await q("select mode, start_at, end_at, links_expire_at from playdates where id = $1", [sent.playdateId])).toEqual([
      { mode: "availability", start_at: null, end_at: null, links_expire_at: new Date("2030-11-21T12:00:00Z") }, // Wed 19:00 Toronto + 12 h
    ]);
    expect((await pages.playdatePageStore.getForOrganizer(alex, sent.playdateId))?.slots).toHaveLength(2);
  });

  it("Send update rewrites the slots, and switching to a set time clears them (KD-02)", async () => {
    const alex = await parent();
    const f = await friend(alex);
    const org = { id: alex, firstName: "Alex", childFirstName: "Mia" };
    const sent = await sendInvite({ store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test" }, org, { ...base, friendIds: [f], slots: ["2030-11-18|morning"] }, NOW);
    if (!sent.ok) throw new Error("expected ok");
    const deps = { pages: pages.playdatePageStore, playdates: playdates.playdateStore, apply: playdates.applyPlaydateUpdate, limiter: open, linkBase: "https://kindred.test" };

    await sendUpdate(deps, org, sent.playdateId, { ...base, friendIds: [f], slots: ["2030-11-19|afternoon", "2030-11-18|morning"] }, NOW);
    expect(await slotsOf(sent.playdateId)).toEqual([{ day: "2030-11-18", slot: "morning" }, { day: "2030-11-19", slot: "afternoon" }]);
    expect(await q("select time_version from playdates where id = $1", [sent.playdateId])).toEqual([{ time_version: 2 }]);

    await sendUpdate(deps, org, sent.playdateId, { ...base, mode: "set_time", day: "2030-11-18", startTime: "10:00", endTime: "12:00", friendIds: [f], slots: [] }, NOW);
    expect(await slotsOf(sent.playdateId)).toEqual([]);
    expect(await q("select mode, start_at from playdates where id = $1", [sent.playdateId])).toEqual([{ mode: "set_time", start_at: new Date("2030-11-18T15:00:00Z") }]);
  });
});
