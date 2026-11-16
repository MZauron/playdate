// Check-ins (T35, migration 0013) against the real database: the organizer and a Kindred invitee can read their playdate's check-ins
// (for the live page), nobody else can, no client can write one, the note is at most 80 characters, and T23's clean-up deletes notes
// thirty days after the playdate. Through the repository: newest first, with the poster's first name only.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, buildWorld, closeDb, countAs, destroyWorld, enabled, failsAs, failure, q, type World } from "./helpers";

const DENIED = "42501";
const CHECK = "23514";

describe.skipIf(!enabled)("check_ins (migration 0013)", () => {
  let w: World;
  beforeAll(async () => {
    w = await buildWorld();
    await q("insert into check_ins (playdate_id, invite_id, kind, note) values ($1, null, 'here', 'By the slide'), ($1, $2, 'late', null)", [w.playdate, w.inviteDev]);
  });
  afterAll(async () => {
    if (w) await destroyWorld(w);
  });

  it("the organizer and a Kindred invitee read them; a stranger and anon don't", async () => {
    const sql = `select id from check_ins where playdate_id = '${w.playdate}'`;
    expect(await countAs({ userId: w.alex }, sql)).toBe(2);
    expect(await countAs({ userId: w.dev }, sql)).toBe(2);
    expect(await countAs({ userId: w.xan }, sql)).toBe(0);
    expect(await failsAs("anon", sql)).toBe(DENIED);
  });

  it("no client writes one", async () => {
    expect(await failsAs({ userId: w.alex }, `insert into check_ins (playdate_id, kind) values ('${w.playdate}', 'here')`)).toBe(DENIED);
    expect(await failsAs({ userId: w.dev }, `delete from check_ins where playdate_id = '${w.playdate}'`)).toBe(DENIED);
  });

  it("a note is 1 to 80 characters", async () => {
    expect((await failure(q("insert into check_ins (playdate_id, kind, note) values ($1, 'here', $2)", [w.playdate, "x".repeat(81)])))?.code).toBe(CHECK);
    expect((await failure(q("insert into check_ins (playdate_id, kind, note) values ($1, 'here', '  ')", [w.playdate])))?.code).toBe(CHECK);
  });

  it("the clean-up deletes notes thirty days after the playdate, once", async () => {
    // Only this world's playdate moves into the past; every other test's playdate stays after the cut-off (tests run side by side).
    await q("update playdates set start_at = '2026-10-01 14:00+00', end_at = '2026-10-01 16:00+00', links_expire_at = '2026-10-02 04:00+00' where id = $1", [w.playdate]);
    const cutoff = new Date("2026-10-15T03:00:00Z");
    const first = await q<{ links_removed: number; notes_removed: number }>("select * from clean_up_old_playdates($1)", [cutoff]);
    expect(first[0]!.notes_removed).toBeGreaterThanOrEqual(2); // Aisha's answer note and the check-in note
    expect(await q("select count(*)::int as n from check_ins where playdate_id = $1 and note is not null", [w.playdate])).toEqual([{ n: 0 }]);
    expect(await q("select count(*)::int as n from check_ins where playdate_id = $1", [w.playdate])).toEqual([{ n: 2 }]); // the check-ins stay
  });
});

describe.skipIf(!apiEnabled)("check-ins repository (T35)", () => {
  let w: World;
  let store: typeof import("@/lib/db/check-ins").checkInStore;
  beforeAll(async () => {
    w = await buildWorld();
    store = (await import("@/lib/db/check-ins")).checkInStore;
  });
  afterAll(async () => {
    if (w) await destroyWorld(w);
    await closeDb();
  });

  it("adds and lists newest first, with first names only", async () => {
    await store.add(w.playdate, null, "here", null, new Date("2030-11-15T19:00:00Z"));
    await store.add(w.playdate, w.inviteDev, "late", "Ten minutes", new Date("2030-11-15T19:05:00Z"));
    const list = await store.list(w.playdate);
    expect(list.map((c) => [c.firstName, c.kind, c.note, c.inviteId])).toEqual([
      ["Dev", "late", "Ten minutes", w.inviteDev],
      ["Alex", "here", null, null],
    ]);
    expect(await store.list(randomUUID())).toEqual([]);
  });
});
