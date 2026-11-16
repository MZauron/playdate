// clean_up_old_playdates (migration 0006, T23): server only; playdates over for 30 days lose their links and notes, newer ones keep
// them, and a second run changes nothing. Needs only the database (scripts/test-db.sh).
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const users: string[] = [];

async function playdateWithAnswer(linksExpireAt: Date): Promise<{ playdateId: string; inviteId: string; tokenHash: string }> {
  const alex = randomUUID();
  users.push(alex);
  await q("insert into auth.users (id, phone) values ($1, $2)", [alex, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Alex', $2)", [alex, `own-${alex}`]);
  const [f] = await q<{ id: string }>(
    "insert into friends (owner_id, parent_name, child_first_name, label, phone_hash) values ($1, 'Dev', 'Arjun', 'Arjun''s dad', $2) returning id",
    [alex, `h-${randomUUID()}`],
  );
  const end = new Date(linksExpireAt.getTime() - 12 * 3_600_000);
  const [p] = await q<{ id: string }>(
    `insert into playdates (organizer_id, title, mode, start_at, end_at, message, links_expire_at)
     values ($1, 'Playdate: Mia & Arjun', 'set_time', $2, $3, 'Park?', $4) returning id`,
    [alex, new Date(end.getTime() - 2 * 3_600_000), end, linksExpireAt],
  );
  const tokenHash = `t-${randomUUID()}`;
  const [i] = await q<{ id: string }>(
    "insert into invites (playdate_id, organizer_id, friend_id, channel, token_hash) values ($1, $2, $3, 'text', $4) returning id",
    [p!.id, alex, f!.id, tokenHash],
  );
  await q("insert into answers (invite_id, kind, reason, note, time_version) values ($1, 'no', 'busy', 'Sorry, we are away!', 1)", [i!.id]);
  return { playdateId: p!.id, inviteId: i!.id, tokenHash };
}

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]); // organizers first (see NEXT.md T24)
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("clean_up_old_playdates (T23)", () => {
  it("is not callable by anon or by a signed-in parent", async () => {
    expect(await failsAs("anon", "select * from clean_up_old_playdates(now())")).toBe(DENIED);
    expect(await failsAs({ userId: randomUUID() }, "select * from clean_up_old_playdates(now())")).toBe(DENIED);
  });

  it("removes the links and notes of playdates past the cut-off, keeps newer ones, and is idempotent", async () => {
    const cutoff = new Date("2026-10-15T03:00:00Z");
    const old = await playdateWithAnswer(new Date(cutoff.getTime() - 60_000));
    const fresh = await playdateWithAnswer(new Date(cutoff.getTime() + 60_000));

    const [first] = await q<{ links_removed: number; notes_removed: number }>("select * from clean_up_old_playdates($1)", [cutoff]);
    expect(first!.links_removed).toBeGreaterThanOrEqual(1);
    expect(first!.notes_removed).toBeGreaterThanOrEqual(1);

    expect(await q("select token_hash from invites where id = $1", [old.inviteId])).toEqual([{ token_hash: null }]);
    expect(await q("select id from invites where token_hash = $1", [old.tokenHash])).toEqual([]); // the old link can never match again
    expect(await q("select kind, reason, note from answers where invite_id = $1", [old.inviteId])).toEqual([{ kind: "no", reason: "busy", note: null }]);

    expect(await q("select token_hash from invites where id = $1", [fresh.inviteId])).toEqual([{ token_hash: fresh.tokenHash }]);
    expect(await q("select note from answers where invite_id = $1", [fresh.inviteId])).toEqual([{ note: "Sorry, we are away!" }]);

    const [second] = await q<{ links_removed: number; notes_removed: number }>("select * from clean_up_old_playdates($1)", [cutoff]);
    expect(second).toEqual({ links_removed: 0, notes_removed: 0 });
  });
});
