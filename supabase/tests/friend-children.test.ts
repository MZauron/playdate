// friend_children and set_friend_children (migration 0016, T42): which of the owner's children each friend knows. Server only; only the
// owner's own friend and children; rows go with the friend or the child.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const users: string[] = [];

async function parent(kids: string[]): Promise<{ id: string; kids: string[]; friend: string }> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Alex', $2)", [id, `own-${id}`]);
  const ids: string[] = [];
  for (const [sort, name] of kids.entries()) {
    const [c] = await q<{ id: string }>("insert into children (parent_id, first_name, age_label, sort) values ($1, $2, '5', $3) returning id", [id, name, sort]);
    ids.push(c!.id);
  }
  const [f] = await q<{ id: string }>(
    "insert into friends (owner_id, parent_name, child_first_name, label, phone_hash) values ($1, 'Dev Patel', 'Arjun', 'Arjun''s dad', $2) returning id",
    [id, `h-${randomUUID()}`],
  );
  return { id, kids: ids, friend: f!.id };
}
const set = (owner: string, friend: string, kids: string[]) => q<{ n: number }>("select set_friend_children($1, $2, $3::uuid[]) as n", [owner, friend, kids]);
const kidsOf = (friend: string) => q<{ child_id: string }>("select child_id from friend_children where friend_id = $1 order by child_id", [friend]);

afterAll(async () => {
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("friend_children (T42)", () => {
  it("is not readable or writable by anon or a signed-in parent, even their own; the function is server only", async () => {
    const alex = await parent(["Mia", "Ethan"]);
    await set(alex.id, alex.friend, alex.kids);
    for (const who of ["anon", { userId: alex.id }] as const) {
      expect(await failsAs(who, "select * from friend_children")).toBe(DENIED);
      expect(await failsAs(who, `delete from friend_children where friend_id = '${alex.friend}'`)).toBe(DENIED);
      expect(await failsAs(who, `select set_friend_children('${alex.id}', '${alex.friend}', array['${alex.kids[0]}']::uuid[])`)).toBe(DENIED);
    }
  });

  it("replaces the friend's children with the owner's own only, for the owner's own friend only", async () => {
    const alex = await parent(["Mia", "Ethan"]);
    const sam = await parent(["Zoe"]);
    expect(await set(alex.id, alex.friend, [alex.kids[1]!, sam.kids[0]!])).toEqual([{ n: 1 }]);
    expect(await kidsOf(alex.friend)).toEqual([{ child_id: alex.kids[1] }]);
    expect(await set(sam.id, alex.friend, sam.kids)).toEqual([{ n: 0 }]); // not Sam's friend
    expect(await kidsOf(alex.friend)).toEqual([{ child_id: alex.kids[1] }]);
  });

  it("goes with the child, and with the friend", async () => {
    const alex = await parent(["Mia", "Ethan"]);
    await set(alex.id, alex.friend, alex.kids);
    await q("delete from children where id = $1", [alex.kids[0]]);
    expect(await kidsOf(alex.friend)).toEqual([{ child_id: alex.kids[1] }]);
    await q("delete from friends where id = $1", [alex.friend]);
    expect(await kidsOf(alex.friend)).toEqual([]);
  });
});
