// The organizer's playdate page repository (src/lib/db/playdate-page.ts) through the local Supabase API: only the organizer
// finds their playdate, Confirm sets every column the schema's checks require, and Home then shows it under Upcoming.
// Skipped unless scripts/test-db.sh could give it the local API.
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
async function friend(ownerId: string, child: string): Promise<string> {
  const rows = await q<{ id: string }>(
    `insert into friends (owner_id, parent_name, child_first_name, label, phone_e164, phone_hash)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [ownerId, `${child}dad Parent`, child, `${child}'s parent`, `+1416555${Math.floor(1000 + Math.random() * 8999)}`, `h-${randomUUID()}`],
  );
  return rows[0]!.id;
}

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]); // organizers first (see NEXT.md T24)
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!apiEnabled)("playdate page repository", () => {
  let page: typeof import("@/lib/db/playdate-page");
  let playdates: typeof import("@/lib/db/playdates");
  let domain: typeof import("@/lib/domain/playdate-page");
  let sendInvite: typeof import("@/lib/domain/playdates").sendInvite;
  let invitePage: typeof import("@/lib/domain/invite-page");
  let invites: typeof import("@/lib/db/invites");
  beforeAll(async () => {
    page = await import("@/lib/db/playdate-page");
    playdates = await import("@/lib/db/playdates");
    domain = await import("@/lib/domain/playdate-page");
    ({ sendInvite } = await import("@/lib/domain/playdates"));
    invitePage = await import("@/lib/domain/invite-page");
    invites = await import("@/lib/db/invites");
  });

  const NOW = new Date("2030-11-01T12:00:00Z");
  async function sent() {
    const alex = await parent("Alex");
    const arjun = await friend(alex, "Arjun");
    const result = await sendInvite(
      { store: playdates.playdateStore, limiter: { hit: () => ({ ok: true }) }, linkBase: "https://kindred.test" },
      { id: alex, firstName: "Alex", childFirstName: "Mia" },
      { friendIds: [arjun], mode: "set_time", day: "2030-11-18", startTime: "10:00", endTime: "12:00", slots: [], zone: "America/Toronto", placeName: "High Park", placeAddress: "", savePlace: false, yourName: "Alex", message: "Park?" },
      NOW,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return { alex, playdateId: result.playdateId, token: decodeURIComponent(result.texts[0]!.href).split("/r/")[1]! };
  }
  const answer = (token: string, kind: "yes" | "no") =>
    invitePage.answerInvite(
      { store: invites.inviteStore, limiters: { token: { hit: () => ({ ok: true }) }, address: { hit: () => ({ ok: true }) } } },
      token,
      "1.2.3.4",
      { kind, reason: kind === "no" ? "busy" : null, note: null, timeVersion: 1 },
      NOW,
    );

  it("finds the playdate for its organizer only, with each friend's current answer", async () => {
    const { alex, playdateId, token } = await sent();
    const sam = await parent("Sam");
    await answer(token, "yes");
    const found = await page.playdatePageStore.getForOrganizer(alex, playdateId);
    expect(found?.invites.map((i) => ({ label: i.label, kind: i.answer?.kind }))).toEqual([{ label: "Arjun's parent", kind: "yes" }]);
    expect(await page.playdatePageStore.getForOrganizer(sam, playdateId)).toBeNull();
  });

  it("refuses to confirm with no yes, then confirms after one and moves to Upcoming on Home", async () => {
    const { alex, playdateId, token } = await sent();
    await answer(token, "no");
    expect(await domain.confirmPlaydate(page.playdatePageStore, alex, playdateId, NOW)).toEqual({ ok: false, code: "CONFIRM_NEEDS_YES" });
    await answer(token, "yes");
    expect(await domain.confirmPlaydate(page.playdatePageStore, alex, playdateId, NOW)).toEqual({ ok: true });

    const [row] = await q<{ status: string; final_start_at: Date; final_end_at: Date; confirmed_at: Date; links_expire_at: Date }>(
      "select status, final_start_at, final_end_at, confirmed_at, links_expire_at from playdates where id = $1",
      [playdateId],
    );
    expect(row).toEqual({
      status: "confirmed",
      final_start_at: new Date("2030-11-18T15:00:00Z"),
      final_end_at: new Date("2030-11-18T17:00:00Z"),
      confirmed_at: NOW,
      links_expire_at: new Date("2030-11-19T05:00:00Z"),
    });
    const { groupForHome } = await import("@/components/home/home-data");
    const home = groupForHome(await playdates.listHomePlaydates(alex, NOW), NOW);
    expect(home.upcoming.map((h) => h.id)).toEqual([playdateId]);
    expect((await invitePage.loadInvite(invites.inviteStore, token, NOW))?.confirmed).toBe(true);
  });

  it("another parent cannot confirm it", async () => {
    const { playdateId, token } = await sent();
    const sam = await parent("Sam");
    await answer(token, "yes");
    expect(await domain.confirmPlaydate(page.playdatePageStore, sam, playdateId, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await q("select status from playdates where id = $1", [playdateId])).toEqual([{ status: "collecting" }]);
  });

  it("cancel: organizer only, the schema's check holds, Home drops it, and the link takes no answer", async () => {
    const { alex, playdateId, token } = await sent();
    const sam = await parent("Sam");
    expect(await domain.cancelPlaydate(page.playdatePageStore, sam, playdateId, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await domain.cancelPlaydate(page.playdatePageStore, alex, playdateId, NOW)).toEqual({ ok: true });
    expect(await q("select status, cancelled_at from playdates where id = $1", [playdateId])).toEqual([{ status: "cancelled", cancelled_at: NOW }]);
    expect((await playdates.listHomePlaydates(alex, NOW)).map((h) => h.id)).not.toContain(playdateId);
    expect((await invitePage.loadInvite(invites.inviteStore, token, NOW))?.state).toBe("cancelled");
    expect(await answer(token, "yes")).toEqual({ ok: false, code: "PLAYDATE_CANCELLED" });
  });
});
