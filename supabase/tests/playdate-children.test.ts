// playdate_children and set_playdate_children (migration 0015, T41): which of the organizer's children a playdate is for. Server only;
// only the organizer's own children on their own playdate; rows go with the playdate or the child.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const users: string[] = [];

async function parent(kids: string[]): Promise<{ id: string; kids: string[] }> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Alex', $2)", [id, `own-${id}`]);
  const ids: string[] = [];
  for (const [sort, name] of kids.entries()) {
    const [c] = await q<{ id: string }>("insert into children (parent_id, first_name, age_label, sort) values ($1, $2, '5', $3) returning id", [id, name, sort]);
    ids.push(c!.id);
  }
  return { id, kids: ids };
}
async function playdate(organizerId: string): Promise<string> {
  const [p] = await q<{ id: string }>(
    `insert into playdates (organizer_id, title, mode, start_at, end_at, message, links_expire_at)
     values ($1, 'Playdate: Mia & Arjun', 'set_time', '2030-11-18T15:00:00Z', '2030-11-18T17:00:00Z', 'Park?', '2030-11-19T05:00:00Z') returning id`,
    [organizerId],
  );
  return p!.id;
}
const set = (pid: string, org: string, kids: string[]) => q<{ n: number }>("select set_playdate_children($1, $2, $3::uuid[]) as n", [pid, org, kids]);
const kidsOf = (pid: string) => q<{ child_id: string }>("select child_id from playdate_children where playdate_id = $1 order by child_id", [pid]);

afterAll(async () => {
  if (users.length) await q("delete from playdates where organizer_id = any($1)", [users]);
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("playdate_children (T41)", () => {
  it("is not readable or writable by anon or a signed-in parent, even their own; the function is server only", async () => {
    const alex = await parent(["Mia"]);
    const pid = await playdate(alex.id);
    await set(pid, alex.id, alex.kids);
    for (const who of ["anon", { userId: alex.id }] as const) {
      expect(await failsAs(who, "select * from playdate_children")).toBe(DENIED);
      expect(await failsAs(who, `insert into playdate_children values ('${pid}', '${alex.kids[0]}')`)).toBe(DENIED);
      expect(await failsAs(who, `select set_playdate_children('${pid}', '${alex.id}', array['${alex.kids[0]}']::uuid[])`)).toBe(DENIED);
    }
  });

  it("replaces the children with the organizer's own only, on their own playdate only", async () => {
    const alex = await parent(["Mia", "Ethan"]);
    const sam = await parent(["Zoe"]);
    const pid = await playdate(alex.id);
    expect(await set(pid, alex.id, [alex.kids[0]!, sam.kids[0]!])).toEqual([{ n: 1 }]); // Sam's child is ignored
    expect(await kidsOf(pid)).toEqual([{ child_id: alex.kids[0] }]);
    await set(pid, alex.id, [alex.kids[1]!]);
    expect(await kidsOf(pid)).toEqual([{ child_id: alex.kids[1] }]);
    expect(await set(pid, sam.id, sam.kids)).toEqual([{ n: 0 }]); // not Sam's playdate
    expect(await kidsOf(pid)).toEqual([{ child_id: alex.kids[1] }]);
  });

  it("goes with the child, and with the playdate", async () => {
    const alex = await parent(["Mia", "Ethan"]);
    const pid = await playdate(alex.id);
    await set(pid, alex.id, alex.kids);
    await q("delete from children where id = $1", [alex.kids[1]]);
    expect(await kidsOf(pid)).toEqual([{ child_id: alex.kids[0] }]);
    await q("delete from playdates where id = $1", [pid]);
    expect(await kidsOf(pid)).toEqual([]);
  });
});
