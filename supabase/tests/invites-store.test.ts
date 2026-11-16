// The invite page's repository (src/lib/db/invites.ts) through the local Supabase API: a token finds its one invite, an answer is
// saved and replaced, an answer from an old time version is not shown, and nothing read holds a phone number. Skipped unless
// scripts/test-db.sh could give it the local API.
import { fakePlaces } from "@/lib/integrations/places/fake";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, q } from "./helpers";

const users: string[] = [];
async function parent(firstName: string, child: string): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, firstName, `own-${id}`]);
  await q("insert into children (parent_id, first_name, age_label) values ($1, $2, '5')", [id, child]);
  return id;
}
async function friend(ownerId: string, child: string): Promise<string> {
  const rows = await q<{ id: string }>(
    `insert into friends (owner_id, parent_name, child_first_name, label, phone_hash)
     values ($1, $2, $3, $4, $5) returning id`,
    [ownerId, `${child} Parent`, child, `${child}'s parent`, `h-${randomUUID()}`],
  );
  return rows[0]!.id;
}

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]); // organizers first (see NEXT.md T24)
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!apiEnabled)("invites repository", () => {
  let invites: typeof import("@/lib/db/invites");
  let playdates: typeof import("@/lib/db/playdates");
  let sendInvite: typeof import("@/lib/domain/playdates").sendInvite;
  let page: typeof import("@/lib/domain/invite-page");
  let hashToken: (token: string) => string;
  beforeAll(async () => {
    invites = await import("@/lib/db/invites");
    playdates = await import("@/lib/db/playdates");
    ({ sendInvite } = await import("@/lib/domain/playdates"));
    page = await import("@/lib/domain/invite-page");
    ({ hashToken } = await import("@/lib/domain/invite-token"));
  });

  const NOW = new Date("2030-11-01T12:00:00Z");
  async function playdateWithTwoFriends() {
    const alex = await parent("Alex", "Mia");
    const dev = await friend(alex, "Arjun");
    const maya = await friend(alex, "Lily");
    const result = await sendInvite(
      { store: playdates.playdateStore, limiter: { hit: () => ({ ok: true }) }, linkBase: "https://kindred.test", places: fakePlaces },
      { id: alex, firstName: "Alex", childFirstName: "Mia" },
      { friendIds: [dev, maya], mode: "set_time", day: "2030-11-18", startTime: "10:00", endTime: "12:00", slots: [], zone: "America/Toronto", placeName: "Riverdale Park", placeAddress: "373 Broadview Ave", savePlace: false, placeId: "", yourName: "Alex", message: "Park?" },
      NOW,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    const [devToken, mayaToken] = result.texts.map((t) => t.body.split("/r/")[1]!);
    return { playdateId: result.playdateId, devToken: devToken!, mayaToken: mayaToken! };
  }
  const deps = () => ({ store: invites.inviteStore, limiters: { token: { hit: () => ({ ok: true as const }) }, address: { hit: () => ({ ok: true as const }) } } });

  it("finds the one invite a token names, with first names and no phone number", async () => {
    const { devToken } = await playdateWithTwoFriends();
    const stored = await invites.inviteStore.findByTokenHash(hashToken(devToken));
    expect(stored).toMatchObject({
      label: "none",
      organizer: { firstName: "Alex", childFirstName: "Mia" },
      playdate: { title: "Playdate: Mia, Arjun & Lily", message: "Park?", placeName: "Riverdale Park", timeVersion: 1, startAt: new Date("2030-11-18T15:00:00Z") },
      answer: null,
    });
    expect(JSON.stringify(stored)).not.toMatch(/\+1416555|phone|hash/);
    expect(await invites.inviteStore.findByTokenHash(hashToken("x".repeat(22)))).toBeNull();
  });

  it("saves an answer for that invite only, and a change replaces it", async () => {
    const { devToken, mayaToken } = await playdateWithTwoFriends();
    expect((await page.answerInvite(deps(), devToken, "1.2.3.4", { kind: "yes", reason: null, note: null, timeVersion: 1 }, NOW)).ok).toBe(true);
    expect((await page.loadInvite(invites.inviteStore, devToken, NOW))?.answer).toEqual({ kind: "yes", reason: null, note: null, pick: null });
    expect((await page.loadInvite(invites.inviteStore, mayaToken, NOW))?.answer).toBeNull();

    await page.answerInvite(deps(), devToken, "1.2.3.4", { kind: "no", reason: "busy", note: "Sorry!", timeVersion: 1 }, NOW);
    const rows = await q<{ kind: string; reason: string; note: string }>(
      "select a.kind, a.reason, a.note from answers a join invites i on i.id = a.invite_id where i.token_hash = $1",
      [hashToken(devToken)],
    );
    expect(rows).toEqual([{ kind: "no", reason: "busy", note: "Sorry!" }]);
  });

  it("an answer from an old time version is not shown, and a new one for it is refused", async () => {
    const { playdateId, devToken } = await playdateWithTwoFriends();
    await page.answerInvite(deps(), devToken, "1.2.3.4", { kind: "yes", reason: null, note: null, timeVersion: 1 }, NOW);
    await q("update playdates set time_version = 2 where id = $1", [playdateId]);
    expect((await page.loadInvite(invites.inviteStore, devToken, NOW))?.answer).toBeNull();
    expect(await page.answerInvite(deps(), devToken, "1.2.3.4", { kind: "yes", reason: null, note: null, timeVersion: 1 }, NOW)).toEqual({ ok: false, code: "STALE_TIME" });
  });
});
