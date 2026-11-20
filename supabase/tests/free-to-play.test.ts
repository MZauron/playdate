// free_statuses, set_free_status and friends_free_now (migration 0017, T45, KD-19): server only; set only for the parent's own child;
// seen only by Kindred parents who are friends both ways, only while on; deleted once off; gone with the child.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const users: string[] = [];

async function parent(name: string, kids: string[] = []): Promise<{ id: string; kids: string[] }> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, name, `own-${id}`]);
  const ids: string[] = [];
  for (const [sort, kid] of kids.entries()) {
    const [c] = await q<{ id: string }>("insert into children (parent_id, first_name, age_label, sort) values ($1, $2, '5', $3) returning id", [id, kid, sort]);
    ids.push(c!.id);
  }
  return { id, kids: ids };
}
/** `owner` adds `friend` to their friends, matched to the friend's account (or a text friend with `matched` false). */
async function add(owner: string, friend: string, matched = true): Promise<string> {
  const [f] = await q<{ id: string }>(
    "insert into friends (owner_id, parent_name, label, phone_hash, kindred_user_id) values ($1, 'Friend', 'Friend', $2, $3) returning id",
    [owner, `h-${randomUUID()}`, matched ? friend : null],
  );
  return f!.id;
}
const set = (parentId: string, childId: string, kind = "tomorrow", words: string | null = null, until = "now() + interval '1 day'") =>
  q<{ ok: boolean }>(`select set_free_status($1, $2, $3, $4, ${until}) as ok`, [parentId, childId, kind, words]);
const seen = (viewer: string) => q<{ friend_id: string; child_first_name: string; kind: string }>("select friend_id, child_first_name, kind from friends_free_now($1, now())", [viewer]);

afterAll(async () => {
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("free to play (T45, KD-19)", () => {
  it("is not readable or writable by anon or a signed-in parent, even their own; the functions are server only", async () => {
    const alex = await parent("Alex", ["Mia"]);
    await set(alex.id, alex.kids[0]!);
    for (const who of ["anon", { userId: alex.id }] as const) {
      expect(await failsAs(who, "select * from free_statuses")).toBe(DENIED);
      expect(await failsAs(who, `delete from free_statuses where parent_id = '${alex.id}'`)).toBe(DENIED);
      expect(await failsAs(who, `select set_free_status('${alex.id}', '${alex.kids[0]}', 'tomorrow', null, now() + interval '1 day')`)).toBe(DENIED);
      expect(await failsAs(who, `select * from friends_free_now('${alex.id}', now())`)).toBe(DENIED);
    }
  });

  it("sets only the parent's own child, replaces it, and keeps it within 2 days", async () => {
    const alex = await parent("Alex", ["Mia"]);
    const sam = await parent("Sam", ["Zoe"]);
    expect(await set(sam.id, alex.kids[0]!)).toEqual([{ ok: false }]);
    expect(await set(alex.id, alex.kids[0]!, "own_words", "After school", "now() + interval '9 days'")).toEqual([{ ok: true }]);
    expect(await set(alex.id, alex.kids[0]!, "this_evening")).toEqual([{ ok: true }]);
    const rows = await q<{ kind: string; words: string | null; within: boolean }>(
      "select kind, words, until <= now() + interval '2 days' as within from free_statuses where parent_id = $1",
      [alex.id],
    );
    expect(rows).toEqual([{ kind: "this_evening", words: null, within: true }]);
    await set(alex.id, alex.kids[0]!, "own_words", "Pool day", "now() + interval '9 days'");
    expect((await q<{ within: boolean }>("select until <= now() + interval '2 days' as within from free_statuses where parent_id = $1", [alex.id]))[0]!.within).toBe(true);
  });

  it("refuses a kind not in the list, own words that are blank or over 50 characters, and words on a time", async () => {
    const alex = await parent("Alex", ["Mia"]);
    await expect(set(alex.id, alex.kids[0]!, "next_month")).rejects.toThrow();
    await expect(set(alex.id, alex.kids[0]!, "own_words", "x".repeat(51))).rejects.toThrow();
    await expect(set(alex.id, alex.kids[0]!, "own_words", null)).rejects.toThrow();
    await expect(set(alex.id, alex.kids[0]!, "tomorrow", "Hi")).rejects.toThrow();
    expect(await set(alex.id, alex.kids[0]!, "own_words", "x".repeat(50))).toEqual([{ ok: true }]);
  });

  it("is seen only by Kindred parents who are friends both ways, by their own friend row", async () => {
    const alex = await parent("Alex", ["Mia", "Ethan"]);
    const dev = await parent("Dev");
    const sam = await parent("Sam");
    const pat = await parent("Pat");
    const devsAlex = await add(dev.id, alex.id);
    await add(alex.id, dev.id); // both ways
    await add(sam.id, alex.id); // Sam added Alex, Alex didn't add Sam
    await add(alex.id, pat.id, false); // Alex has Pat as a text friend only
    await add(pat.id, alex.id);
    await set(alex.id, alex.kids[0]!, "tomorrow");
    await set(alex.id, alex.kids[1]!, "this_evening");
    expect(await seen(dev.id)).toEqual(
      expect.arrayContaining([
        { friend_id: devsAlex, child_first_name: "Mia", kind: "tomorrow" },
        { friend_id: devsAlex, child_first_name: "Ethan", kind: "this_evening" },
      ]),
    );
    expect(await seen(dev.id)).toHaveLength(2);
    expect(await seen(sam.id)).toEqual([]);
    expect(await seen(pat.id)).toEqual([]);
    expect(await seen(alex.id)).toEqual([]); // nobody else is free
  });

  it("stops showing when either side removes the other, and once it turns off", async () => {
    const alex = await parent("Alex", ["Mia"]);
    const dev = await parent("Dev");
    await add(dev.id, alex.id);
    const alexsDev = await add(alex.id, dev.id);
    await set(alex.id, alex.kids[0]!);
    expect(await seen(dev.id)).toHaveLength(1);
    await q("delete from friends where id = $1", [alexsDev]);
    expect(await seen(dev.id)).toEqual([]);
    await add(alex.id, dev.id);
    expect(await seen(dev.id)).toHaveLength(1);
    expect(await q("select * from friends_free_now($1, now() + interval '2 days')", [dev.id])).toEqual([]);
  });

  it("deletes statuses that have turned off on the next write, and goes with the child", async () => {
    const alex = await parent("Alex", ["Mia", "Ethan"]);
    await set(alex.id, alex.kids[0]!, "own_words", "Free now");
    await q("update free_statuses set set_at = now() - interval '3 days', until = now() - interval '1 day' where child_id = $1", [alex.kids[0]]);
    await set(alex.id, alex.kids[1]!);
    expect(await q("select child_id from free_statuses where parent_id = $1", [alex.id])).toEqual([{ child_id: alex.kids[1] }]);
    await q("delete from children where id = $1", [alex.kids[1]]);
    expect(await q("select child_id from free_statuses where parent_id = $1", [alex.id])).toEqual([]);
  });
});
