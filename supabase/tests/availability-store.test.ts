// Share availability against the real database (migration 0005): Send writes the free slots with the playdate, Send update rewrites
// them, and switching to a set time clears them (KD-02). Through the local Supabase API (scripts/test-db.sh).
import { fakePlaces } from "@/lib/integrations/places/fake";
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
  const base = { mode: "availability", day: "", startTime: "", endTime: "", zone: "America/Toronto", placeName: "", placeAddress: "", savePlace: false, placeId: "", yourName: "Alex", message: "Which works?" };
  const slotsOf = (id: string) => q<{ day: string; slot: string }>("select to_char(day, 'YYYY-MM-DD') as day, slot::text from availability_slots where playdate_id = $1 order by day, slot", [id]);

  it("Send writes the slots with the playdate, no start or end, and links until the last slot + 12 h", async () => {
    const alex = await parent();
    const f = await friend(alex);
    const sent = await sendInvite({ store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test", places: fakePlaces }, { id: alex, firstName: "Alex", childFirstName: "Mia" }, { ...base, friendIds: [f], slots: ["2030-11-18|morning", "2030-11-20|evening"] }, NOW);
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
    const sent = await sendInvite({ store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test", places: fakePlaces }, org, { ...base, friendIds: [f], slots: ["2030-11-18|morning"] }, NOW);
    if (!sent.ok) throw new Error("expected ok");
    const deps = { pages: pages.playdatePageStore, playdates: playdates.playdateStore, apply: playdates.applyPlaydateUpdate, limiter: open, linkBase: "https://kindred.test", places: fakePlaces };

    await sendUpdate(deps, org, sent.playdateId, { ...base, friendIds: [f], slots: ["2030-11-19|afternoon", "2030-11-18|morning"] }, NOW);
    expect(await slotsOf(sent.playdateId)).toEqual([{ day: "2030-11-18", slot: "morning" }, { day: "2030-11-19", slot: "afternoon" }]);
    expect(await q("select time_version from playdates where id = $1", [sent.playdateId])).toEqual([{ time_version: 2 }]);

    await sendUpdate(deps, org, sent.playdateId, { ...base, mode: "set_time", day: "2030-11-18", startTime: "10:00", endTime: "12:00", friendIds: [f], slots: [] }, NOW);
    expect(await slotsOf(sent.playdateId)).toEqual([]);
    expect(await q("select mode, start_at from playdates where id = $1", [sent.playdateId])).toEqual([{ mode: "set_time", start_at: new Date("2030-11-18T15:00:00Z") }]);
  });

  it("picks are saved and read back for Everyone's picks with first names only, and Switch to this replaces a pick", async () => {
    const { inviteStore } = await import("@/lib/db/invites");
    const page = await import("@/lib/domain/invite-page");
    const alex = await parent();
    const dev = await friend(alex);
    const maya = (await q<{ id: string }>(
      `insert into friends (owner_id, parent_name, child_first_name, label, phone_e164, phone_hash) values ($1, 'Maya Chen', 'Lily', 'Lily''s parent', $2, $3) returning id`,
      [alex, `+1416555${Math.floor(1000 + Math.random() * 8999)}`, `h-${randomUUID()}`],
    ))[0]!.id;
    const sent = await sendInvite({ store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test", places: fakePlaces }, { id: alex, firstName: "Alex", childFirstName: "Mia" }, { ...base, friendIds: [dev, maya], slots: ["2030-11-18|morning", "2030-11-18|afternoon"] }, NOW);
    if (!sent.ok) throw new Error("expected ok");
    const [devToken, mayaToken] = sent.texts.map((t) => decodeURIComponent(t.href).split("/r/")[1]!);
    const deps = { store: inviteStore, limiters: { token: open, address: open } };
    const pick = (from: string, until: string) => ({ kind: "pick" as const, reason: null, note: null, timeVersion: 1, pickDay: "2030-11-18", pickFrom: from, pickUntil: until });

    expect((await page.answerInvite(deps, devToken!, "1.2.3.4", pick("09:30", "11:00"), NOW)).ok).toBe(true);
    expect((await page.answerInvite(deps, mayaToken!, "1.2.3.4", pick("13:00", "14:00"), NOW)).ok).toBe(true);
    expect(await page.answerInvite(deps, mayaToken!, "1.2.3.4", pick("12:00", "13:00"), NOW)).toMatchObject({ ok: false, code: "PICK_OUTSIDE_FREE_SLOT" });

    const mayaView = await page.loadInvite(inviteStore, mayaToken!, NOW);
    expect(mayaView?.picks.map((p) => ({ others: p.others, families: p.families, yours: p.yours }))).toEqual([
      { others: ["Dev"], families: 1, yours: false },
      { others: [], families: 1, yours: true },
    ]);
    expect(JSON.stringify(mayaView)).not.toMatch(/Patel|\+1416|invite/i);

    // Switch to this: Maya takes Dev's range.
    await page.answerInvite(deps, mayaToken!, "1.2.3.4", pick("09:30", "11:00"), NOW);
    const after = await page.loadInvite(inviteStore, mayaToken!, NOW);
    expect(after?.picks.map((p) => ({ others: p.others, families: p.families, mostPicked: p.mostPicked, yours: p.yours }))).toEqual([{ others: ["Dev"], families: 2, mostPicked: true, yours: true }]);
    expect(await q("select count(*)::int as n from answers a join invites i on i.id = a.invite_id where i.playdate_id = $1", [sent.playdateId])).toEqual([{ n: 2 }]);
  });

  it("the tick stamps a text friend once (KD-12), and confirming a suggested pick sets the final time everywhere (KD-09)", async () => {
    const { inviteStore } = await import("@/lib/db/invites");
    const { tickStore } = await import("@/lib/db/tick");
    const { runMajorityNotices, homeNotices } = await import("@/lib/domain/majority");
    const { confirmPlaydate } = await import("@/lib/domain/playdate-page");
    const page = await import("@/lib/domain/invite-page");
    const alex = await parent();
    const ids = [await friend(alex), await friend(alex), await friend(alex)];
    const sent = await sendInvite({ store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test", places: fakePlaces }, { id: alex, firstName: "Alex", childFirstName: "Mia" }, { ...base, friendIds: ids, slots: ["2030-11-18|morning", "2030-11-18|afternoon"] }, NOW);
    if (!sent.ok) throw new Error("expected ok");
    const tokens = sent.texts.map((t) => decodeURIComponent(t.href).split("/r/")[1]!);
    const deps = { store: inviteStore, limiters: { token: open, address: open } };
    const pick = (from: string, until: string) => ({ kind: "pick" as const, reason: null, note: null, timeVersion: 1, pickDay: "2030-11-18", pickFrom: from, pickUntil: until });
    await page.answerInvite(deps, tokens[0]!, "1.2.3.4", pick("09:30", "11:00"), NOW);
    await page.answerInvite(deps, tokens[1]!, "1.2.3.4", pick("09:30", "11:00"), NOW);
    await page.answerInvite(deps, tokens[2]!, "1.2.3.4", pick("13:00", "14:00"), NOW);

    const stampedNow = await q<{ n: number }>("select count(*)::int as n from invites where playdate_id = $1 and majority_notice_at is not null", [sent.playdateId]);
    expect(stampedNow).toEqual([{ n: 0 }]);
    await runMajorityNotices(tickStore, NOW);
    await runMajorityNotices(tickStore, new Date(NOW.getTime() + 60_000));
    const stamps = await q<{ majority_notice_at: Date }>("select majority_notice_at from invites where playdate_id = $1 and majority_notice_at is not null", [sent.playdateId]);
    expect(stamps).toEqual([{ majority_notice_at: NOW }]); // one invite, stamped by the first run only

    const organizerView = await pages.playdatePageStore.getForOrganizer(alex, sent.playdateId);
    expect(homeNotices(organizerView!)).toHaveLength(1);

    const chosen = { start: new Date("2030-11-18T14:30:00Z"), end: new Date("2030-11-18T16:00:00Z") }; // 9:30–11:00 Toronto
    expect(await confirmPlaydate(pages.playdatePageStore, alex, sent.playdateId, NOW, chosen)).toEqual({ ok: true });
    expect(await q("select status, final_start_at, final_end_at, links_expire_at from playdates where id = $1", [sent.playdateId])).toEqual([
      { status: "confirmed", final_start_at: chosen.start, final_end_at: chosen.end, links_expire_at: new Date("2030-11-19T04:00:00Z") },
    ]);
    const friendView = await page.loadInvite(inviteStore, tokens[2]!, NOW);
    expect(friendView).toMatchObject({ confirmed: true, start: chosen.start, end: chosen.end });
    expect(homeNotices((await pages.playdatePageStore.getForOrganizer(alex, sent.playdateId))!)).toEqual([]);
  });
});
