// Send invite against the real database (migration 0003 and src/lib/db/playdates.ts through the local Supabase API with the
// service role): one transaction, only token hashes stored, never another parent's friend. Skipped unless scripts/test-db.sh could
// give it the local API; the privilege check needs only the database.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const FOREIGN_KEY = "23503";

const users: string[] = [];
async function parent(firstName = "Alex"): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, firstName, `own-${id}`]);
  await q("insert into children (parent_id, first_name, age_label) values ($1, 'Mia', '5')", [id]);
  return id;
}
async function friend(ownerId: string, child: string, kindredUserId: string | null = null): Promise<string> {
  const rows = await q<{ id: string }>(
    `insert into friends (owner_id, parent_name, child_first_name, label, phone_e164, phone_hash, kindred_user_id)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [ownerId, `${child} Parent`, child, `${child}'s parent`, `+1416555${Math.floor(1000 + Math.random() * 8999)}`, `h-${randomUUID()}`, kindredUserId],
  );
  return rows[0]!.id;
}
const playdateJson = (organizerId: string) =>
  JSON.stringify({
    organizer_id: organizerId,
    title: "Playdate: Mia & Arjun",
    mode: "set_time",
    timezone: "America/Toronto",
    start_at: "2030-11-18T15:00:00Z",
    end_at: "2030-11-18T17:00:00Z",
    message: "Park?",
    links_expire_at: "2030-11-19T05:00:00Z",
  });

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]); // organizers first (see NEXT.md T24)
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("create_playdate_with_invites", () => {
  it("is not callable by anon or by a signed-in parent, even for their own playdate", async () => {
    const alex = await parent();
    const dev = await friend(alex, "Arjun");
    const invites = JSON.stringify([{ friend_id: dev, invitee_user_id: null, channel: "text", token_hash: `t-${randomUUID()}` }]);
    const sql = `select create_playdate_with_invites('${playdateJson(alex)}'::jsonb, '${invites}'::jsonb)`;
    expect(await failsAs("anon", sql)).toBe(DENIED);
    expect(await failsAs({ userId: alex }, sql)).toBe(DENIED);
    expect(await q("select id from playdates where organizer_id = $1", [alex])).toEqual([]);
  });

  it("writes nothing when one invite is refused: another parent's friend fails the composite key", async () => {
    const alex = await parent();
    const sam = await parent("Sam");
    const dev = await friend(alex, "Arjun");
    const samsFriend = await friend(sam, "Zoe");
    const invites = JSON.stringify([
      { friend_id: dev, invitee_user_id: null, channel: "text", token_hash: `t-${randomUUID()}` },
      { friend_id: samsFriend, invitee_user_id: null, channel: "text", token_hash: `t-${randomUUID()}` },
    ]);
    expect(await failsAs("service", `select create_playdate_with_invites('${playdateJson(alex)}'::jsonb, '${invites}'::jsonb)`)).toBe(FOREIGN_KEY);
    expect(await q("select id from playdates where organizer_id = $1", [alex])).toEqual([]);
  });
});

describe.skipIf(!apiEnabled)("playdates repository", () => {
  let repo: typeof import("@/lib/db/playdates");
  let domain: typeof import("@/lib/domain/playdates");
  let hashToken: (token: string) => string;
  beforeAll(async () => {
    repo = await import("@/lib/db/playdates");
    domain = await import("@/lib/domain/playdates");
    ({ hashToken } = await import("@/lib/domain/invite-token"));
  });

  const send = (organizerId: string, friendIds: string[], extra: Partial<import("@/lib/domain/playdates").PlanFormInput> = {}) =>
    domain.sendInvite(
      { store: repo.playdateStore, limiter: { hit: () => ({ ok: true }) }, linkBase: "https://kindred.test" },
      { id: organizerId, firstName: "Alex", childFirstName: "Mia" },
      {
        friendIds,
        mode: "set_time",
        day: "2030-11-18",
        startTime: "10:00",
        endTime: "12:00",
        zone: "America/Toronto",
        placeName: "",
        placeAddress: "",
        savePlace: false,
        yourName: "Alex",
        message: "Park?",
        ...extra,
      },
      new Date("2030-11-01T12:00:00Z"),
    );

  it("stores the playdate and one invite per friend, with only the sha256 of each link token", async () => {
    const alex = await parent();
    const maya = await parent("Maya");
    const dev = await friend(alex, "Arjun");
    const lily = await friend(alex, "Lily", maya);
    const result = await send(alex, [dev, lily]);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));

    const [row] = await q<{ title: string; start_at: Date; links_expire_at: Date; status: string }>(
      "select title, start_at, links_expire_at, status from playdates where id = $1",
      [result.playdateId],
    );
    expect(row).toEqual({ title: "Playdate: Mia, Arjun & Lily", start_at: new Date("2030-11-18T15:00:00Z"), links_expire_at: new Date("2030-11-19T05:00:00Z"), status: "collecting" });

    const invites = await q<{ friend_id: string; channel: string; invitee_user_id: string | null; token_hash: string }>(
      "select friend_id, channel, invitee_user_id, token_hash from invites where playdate_id = $1 order by channel desc",
      [result.playdateId],
    );
    expect(invites.map(({ friend_id, channel, invitee_user_id }) => ({ friend_id, channel, invitee_user_id }))).toEqual([
      { friend_id: dev, channel: "text", invitee_user_id: null },
      { friend_id: lily, channel: "app", invitee_user_id: maya },
    ]);
    const tokens = result.texts.map((t) => decodeURIComponent(t.href).split("/r/")[1]!);
    expect(tokens.every((t) => /^[A-Za-z0-9_-]{22}$/.test(t))).toBe(true);
    expect(invites.map((i) => i.token_hash).sort()).toEqual(tokens.map(hashToken).sort());
    const anywhere = await q("select 1 from invites where token_hash = any($1)", [tokens]);
    expect(anywhere).toEqual([]);
  });

  it("finds only the organizer's own friends", async () => {
    const alex = await parent();
    const sam = await parent("Sam");
    const dev = await friend(alex, "Arjun");
    const samsFriend = await friend(sam, "Zoe");
    expect((await repo.playdateStore.friendsForInvite(alex, [dev, samsFriend])).map((f) => f.id)).toEqual([dev]);
    const result = await send(sam, [dev]);
    expect(result).toEqual({ ok: false, errors: [{ code: "NO_INVITEES", field: "invitees" }] });
  });

  it("saves a typed place once per name and changes the organizer's first name", async () => {
    const alex = await parent();
    const dev = await friend(alex, "Arjun");
    await send(alex, [dev], { placeName: "Riverdale Park", placeAddress: "373 Broadview Ave", savePlace: true, yourName: "Alexandra" });
    await repo.playdateStore.saveTypedPlace(alex, "riverdale park", "Somewhere else");
    expect(await repo.listTypedPlaces(alex)).toEqual([{ name: "Riverdale Park", address: "373 Broadview Ave" }]);
    expect(await q("select first_name from profiles where id = $1", [alex])).toEqual([{ first_name: "Alexandra" }]);
  });

  it("lists the organizer's open playdates for Home, and nobody else's", async () => {
    const alex = await parent();
    const sam = await parent("Sam");
    const dev = await friend(alex, "Arjun");
    const result = await send(alex, [dev]);
    if (!result.ok) throw new Error("expected ok");
    const now = new Date("2030-11-01T12:00:00Z");
    const home = await repo.listHomePlaydates(alex, now);
    expect(home.map(({ id, title, inviteCount, friendInitials, answers, start }) => ({ id, title, inviteCount, friendInitials, answers, start }))).toEqual([
      { id: result.playdateId, title: "Playdate: Mia & Arjun", inviteCount: 1, friendInitials: ["A"], answers: [], start: new Date("2030-11-18T15:00:00Z") },
    ]);
    expect(await repo.listHomePlaydates(sam, now)).toEqual([]);
    expect(await repo.listHomePlaydates(alex, new Date("2030-11-20T12:00:00Z"))).toEqual([]); // links expired: over
  });
});
