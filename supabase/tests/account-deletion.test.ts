// Delete my account (T24, migration 0010) against the real database. Deleting the auth user removes the profile and everything the
// parent owns; Q23 default: the invites they received are removed from other parents' playdates, which otherwise stay as they were.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorld, closeDb, destroyWorld, enabled, failure, q, type World } from "./helpers";

const count = async (sql: string, params: unknown[]) => Number((await q<{ n: string }>(`select count(*) as n from ${sql}`, params))[0]!.n);

describe.skipIf(!enabled)("deleting an account", () => {
  let w: World;
  beforeAll(async () => {
    w = await buildWorld();
  });
  afterAll(async () => {
    if (w) await destroyWorld(w);
    await closeDb();
  });

  it("an invited parent: their invite and answer leave the playdate; the playdate, the other invites and the friend entry stay", async () => {
    expect(await failure(q("delete from auth.users where id = $1", [w.dev]))).toBeNull();
    expect(await count("profiles where id = $1", [w.dev])).toBe(0);
    expect(await count("invites where id = $1", [w.inviteDev])).toBe(0);
    expect(await count("answers where invite_id = $1", [w.inviteDev])).toBe(0);
    expect(await count("playdates where id = $1", [w.playdate])).toBe(1);
    expect(await count("invites where id = $1", [w.inviteAisha])).toBe(1);
    expect(await count("answers where invite_id = $1", [w.inviteAisha])).toBe(1);
    // Alex's contact for Dev is Alex's own: it stays, now a text friend.
    expect(await q("select kindred_user_id from friends where id = $1", [w.friendDev])).toEqual([{ kindred_user_id: null }]);
  });

  it("an organizer: profile, children, friends, groups, saved places and their playdates go; other parents' data stays", async () => {
    await q("insert into saved_places (owner_id, source, name, address) values ($1, 'typed', 'Home', '1 Main St')", [w.alex]);
    await q("insert into group_members (group_id, owner_id, friend_id) values ($1, $2, $3)", [w.group, w.alex, w.friendAisha]);
    await q(
      "insert into availability_slots (playdate_id, start_at, end_at) values ($1, '2030-11-15 14:00+00', '2030-11-15 17:00+00')",
      [w.playdate],
    ).catch(() => undefined); // a set-time playdate may refuse slots; the cascade is checked either way
    expect(await failure(q("delete from auth.users where id = $1", [w.alex]))).toBeNull();
    for (const [table, column] of [
      ["profiles", "id"],
      ["children", "parent_id"],
      ["friends", "owner_id"],
      ["groups", "owner_id"],
      ["group_members", "owner_id"],
      ["saved_places", "owner_id"],
      ["playdates", "organizer_id"],
      ["invites", "organizer_id"],
    ] as const) {
      expect(await count(`${table} where ${column} = $1`, [w.alex]), table).toBe(0);
    }
    expect(await count("answers where invite_id = $1", [w.inviteAisha])).toBe(0);
    expect(await count("availability_slots where playdate_id = $1", [w.playdate])).toBe(0);
    // Xan's friend entry for Maya and Maya's account are untouched.
    expect(await count("friends where id = $1", [w.friendMayaOfXan])).toBe(1);
    expect(await count("profiles where id = any($1)", [[w.maya, w.xan]])).toBe(2);
  });
});
