// update_playdate (migration 0004) and Send update against the real database: server only, one transaction, the KD-10 effects on
// rows, and an answer from an old link after a time change refused (STALE_TIME). The privilege check needs only the database; the
// rest goes through the local Supabase API (scripts/test-db.sh).
import { fakePlaces } from "@/lib/integrations/places/fake";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
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

describe.skipIf(!enabled)("update_playdate privileges", () => {
  it("is not callable by anon or by a signed-in parent", async () => {
    const alex = await parent("Alex");
    const sql = `select update_playdate('${randomUUID()}', '${alex}', '{}'::jsonb, '[]'::jsonb, '{}'::uuid[], false, null)`;
    expect(await failsAs("anon", sql)).toBe(DENIED);
    expect(await failsAs({ userId: alex }, sql)).toBe(DENIED);
  });
});

describe.skipIf(!apiEnabled)("Send update against the database", () => {
  let playdates: typeof import("@/lib/db/playdates");
  let pages: typeof import("@/lib/db/playdate-page");
  let invites: typeof import("@/lib/db/invites");
  let sendInvite: typeof import("@/lib/domain/playdates").sendInvite;
  let sendUpdate: typeof import("@/lib/domain/edit-playdate").sendUpdate;
  let confirmPlaydate: typeof import("@/lib/domain/playdate-page").confirmPlaydate;
  let answerInvite: typeof import("@/lib/domain/invite-page").answerInvite;
  beforeAll(async () => {
    playdates = await import("@/lib/db/playdates");
    pages = await import("@/lib/db/playdate-page");
    invites = await import("@/lib/db/invites");
    ({ sendInvite } = await import("@/lib/domain/playdates"));
    ({ sendUpdate } = await import("@/lib/domain/edit-playdate"));
    ({ confirmPlaydate } = await import("@/lib/domain/playdate-page"));
    ({ answerInvite } = await import("@/lib/domain/invite-page"));
  });

  const NOW = new Date("2030-11-01T12:00:00Z");
  const open = { hit: () => ({ ok: true as const }) };
  const base = { mode: "set_time", day: "2030-11-18", startTime: "10:00", endTime: "12:00", slots: [] as string[], zone: "America/Toronto", placeName: "High Park", placeAddress: "", savePlace: false, placeId: "", yourName: "Alex", message: "Park?" };
  const deps = () => ({ pages: pages.playdatePageStore, playdates: playdates.playdateStore, apply: playdates.applyPlaydateUpdate, limiter: open, linkBase: "https://kindred.test", places: fakePlaces });
  const answer = (token: string, timeVersion: number) =>
    answerInvite({ store: invites.inviteStore, limiters: { token: open, address: open } }, token, "1.2.3.4", { kind: "yes", reason: null, note: null, timeVersion }, NOW);

  async function confirmedPlaydate() {
    const alex = await parent("Alex");
    const [f1, f2, f3] = [await friend(alex, "Arjun"), await friend(alex, "Lily"), await friend(alex, "Zoe")];
    const org = { id: alex, firstName: "Alex", childFirstName: "Mia" };
    const sent = await sendInvite({ store: playdates.playdateStore, limiter: open, linkBase: "https://kindred.test", places: fakePlaces }, org, { friendIds: [f1!, f2!], ...base }, NOW);
    if (!sent.ok) throw new Error(JSON.stringify(sent.errors));
    const token = sent.texts[0]!.body.split("/r/")[1]!;
    await answer(token, 1);
    expect(await confirmPlaydate(pages.playdatePageStore, alex, sent.playdateId, NOW)).toEqual({ ok: true });
    return { alex, org, f1: f1!, f2: f2!, f3: f3!, id: sent.playdateId, token };
  }
  const rows = (id: string) =>
    q<{ status: string; time_version: number; final_start_at: Date | null; confirmed_at: Date | null; title: string }>(
      "select status, time_version, final_start_at, confirmed_at, title from playdates where id = $1",
      [id],
    );
  const inviteRows = (id: string) =>
    q<{ friend_id: string; label: string; kind: string | null }>(
      "select i.friend_id, i.label, a.kind from invites i left join answers a on a.invite_id = i.id where i.playdate_id = $1 order by i.created_at, i.friend_id",
      [id],
    );

  it("a message change keeps it confirmed with its answers and labels the invites Updated", async () => {
    const { org, f1, f2, id } = await confirmedPlaydate();
    expect(await sendUpdate(deps(), org, id, { friendIds: [f1, f2], ...base, message: "Park? Snacks too." }, NOW)).toMatchObject({ ok: true, changed: true, kind: "updated" });
    expect((await rows(id))[0]).toMatchObject({ status: "confirmed", time_version: 1 });
    expect((await inviteRows(id)).map((r) => [r.label, r.kind])).toEqual(expect.arrayContaining([["updated", "yes"], ["updated", null]]));
  });

  it("a new time clears answers and the final time, labels New time, and an answer from the old version is refused (STALE_TIME)", async () => {
    const { org, f1, f2, id, token } = await confirmedPlaydate();
    await sendUpdate(deps(), org, id, { friendIds: [f1, f2], ...base, startTime: "14:00", endTime: "16:00" }, NOW);
    expect((await rows(id))[0]).toMatchObject({ status: "collecting", time_version: 2, final_start_at: null, confirmed_at: null });
    expect((await inviteRows(id)).map((r) => [r.label, r.kind])).toEqual([["new_time", null], ["new_time", null]]);
    expect(await answer(token, 1)).toEqual({ ok: false, code: "STALE_TIME" });
    expect((await answer(token, 2)).ok).toBe(true);
  });

  it("adds and removes friends in one step, and the title follows", async () => {
    const { org, f1, f2, f3, id } = await confirmedPlaydate();
    await sendUpdate(deps(), org, id, { friendIds: [f1, f3], ...base }, NOW);
    const after = await inviteRows(id);
    expect(after.map((r) => r.friend_id).sort()).toEqual([f1, f3].sort());
    expect(after.find((r) => r.friend_id === f2)).toBeUndefined();
    expect((await rows(id))[0]?.title).toBe("Playdate: Mia, Arjun & Zoe");
  });

  it("another parent cannot update it, and nothing changes", async () => {
    const { f1, f2, id } = await confirmedPlaydate();
    const sam = await parent("Sam");
    const result = await sendUpdate(deps(), { id: sam, firstName: "Sam", childFirstName: "Leo" }, id, { friendIds: [f1, f2], ...base, message: "hijack" }, NOW);
    expect(result).toEqual({ ok: false, errors: [{ code: "NOT_FOUND" }] });
    expect(await q("select message from playdates where id = $1", [id])).toEqual([{ message: "Park?" }]);
  });
});
