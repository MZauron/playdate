// T15 against the real database: a Kindred friend finds and answers only their own invites (by id + their user id), Home lists only
// theirs while open, and another parent's id finds nothing. Through the local Supabase API (scripts/test-db.sh).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, q } from "./helpers";

const users: string[] = [];
async function parent(firstName: string): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, firstName, `own-${id}`]);
  await q("insert into children (parent_id, first_name, age_label) values ($1, 'Mia', '5')", [id]);
  return id;
}
async function friendWithKindred(ownerId: string, kindredUserId: string): Promise<string> {
  const rows = await q<{ id: string }>(
    `insert into friends (owner_id, parent_name, child_first_name, label, phone_e164, phone_hash, kindred_user_id)
     values ($1, 'Priya Shah', 'Noor', 'Noor''s parent', $2, $3, $4) returning id`,
    [ownerId, `+1416555${Math.floor(1000 + Math.random() * 8999)}`, `h-${randomUUID()}`, kindredUserId],
  );
  return rows[0]!.id;
}

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]); // organizers first (see NEXT.md T24)
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!apiEnabled)("invites between Kindred users (T15)", () => {
  let invites: typeof import("@/lib/db/invites");
  let playdates: typeof import("@/lib/db/playdates");
  let page: typeof import("@/lib/domain/invite-page");
  let sendInvite: typeof import("@/lib/domain/playdates").sendInvite;
  beforeAll(async () => {
    invites = await import("@/lib/db/invites");
    playdates = await import("@/lib/db/playdates");
    page = await import("@/lib/domain/invite-page");
    ({ sendInvite } = await import("@/lib/domain/playdates"));
  });

  const NOW = new Date("2030-11-01T12:00:00Z");
  const open = { hit: () => ({ ok: true as const }) };

  it("finds and answers only the invitee's own invite; Home lists it; another parent finds nothing", async () => {
    const alex = await parent("Alex");
    const priya = await parent("Priya");
    const sam = await parent("Sam");
    const f = await friendWithKindred(alex, priya);
    const sent = await sendInvite(
      { store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test" },
      { id: alex, firstName: "Alex", childFirstName: "Mia" },
      { friendIds: [f], mode: "set_time", day: "2030-11-18", startTime: "10:00", endTime: "12:00", slots: [], zone: "America/Toronto", placeName: "Christie Pits", placeAddress: "", savePlace: false, yourName: "Alex", message: "Sunday?" },
      NOW,
    );
    if (!sent.ok) throw new Error(JSON.stringify(sent.errors));
    const [row] = await q<{ id: string; channel: string; invitee_user_id: string }>("select id, channel, invitee_user_id from invites where playdate_id = $1", [sent.playdateId]);
    expect(row).toMatchObject({ channel: "app", invitee_user_id: priya });
    const inviteId = row!.id;

    const home = await invites.listInvitesForUser(priya, NOW);
    expect(home.map((h) => ({ inviteId: h.inviteId, organizer: h.organizerFirstName, place: h.placeName, myAnswer: h.myAnswer }))).toEqual([
      { inviteId, organizer: "Alex", place: "Christie Pits", myAnswer: null },
    ]);
    expect(await invites.listInvitesForUser(sam, NOW)).toEqual([]);
    expect(JSON.stringify(home)).not.toMatch(/\+1416|hash|Shah/);

    expect(await page.loadInviteForInvitee(invites.inviteStore, inviteId, sam, NOW)).toBeNull();
    expect((await page.loadInviteForInvitee(invites.inviteStore, inviteId, priya, NOW))?.title).toBe("Playdate: Mia & Noor");

    const deps = { store: invites.inviteStore, limiters: { token: open, address: open } };
    const yes = { kind: "yes" as const, reason: null, note: null, timeVersion: 1 };
    expect(await page.answerInviteAsInvitee(deps, inviteId, sam, yes, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect((await page.answerInviteAsInvitee(deps, inviteId, priya, yes, NOW)).ok).toBe(true);
    expect((await invites.listInvitesForUser(priya, NOW))[0]?.myAnswer).toBe("yes");

    await q("update playdates set status = 'cancelled', cancelled_at = now() where id = $1", [sent.playdateId]);
    expect(await invites.listInvitesForUser(priya, NOW)).toEqual([]);
  });
});
