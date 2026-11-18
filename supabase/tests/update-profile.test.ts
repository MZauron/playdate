// update_profile_with_children (migration 0014, T39): the Profile tab's one-step save. Server only; a parent can only touch their own
// children; at least one child stays.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const CHECK = "23514";
const users: string[] = [];

async function parent(first = "Alex", kids: string[] = ["Mia", "Ethan"]): Promise<{ id: string; kids: { id: string; first_name: string }[] }> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, first, `own-${id}`]);
  for (const [sort, name] of kids.entries()) await q("insert into children (parent_id, first_name, age_label, sort) values ($1, $2, '5', $3)", [id, name, sort]);
  return { id, kids: await q("select id, first_name from children where parent_id = $1 order by sort", [id]) };
}
const save = (id: string, first: string, children: object[]) => q<{ ok: boolean }>("select update_profile_with_children($1, $2, $3::jsonb) as ok", [id, first, JSON.stringify(children)]);
const kidsOf = (id: string) => q<{ first_name: string; age_label: string; sort: number }>("select first_name, age_label, sort from children where parent_id = $1 order by sort", [id]);

afterAll(async () => {
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("update_profile_with_children (T39)", () => {
  it("is not callable by anon or by a signed-in parent, even for themselves", async () => {
    const alex = await parent();
    const sql = `select update_profile_with_children('${alex.id}', 'Al', '[{"first_name":"Mia","age_label":"5","sort":0}]'::jsonb)`;
    expect(await failsAs("anon", sql)).toBe(DENIED);
    expect(await failsAs({ userId: alex.id }, sql)).toBe(DENIED);
  });

  it("renames the parent, updates kept children in place, adds new ones and deletes the missing ones", async () => {
    const alex = await parent();
    const [mia] = alex.kids;
    const [{ ok }] = (await save(alex.id, "Alexandra", [
      { id: mia!.id, first_name: "Mia", age_label: "6", sort: 0 },
      { id: null, first_name: "Leo", age_label: "baby", sort: 1 },
    ])) as [{ ok: boolean }];
    expect(ok).toBe(true);
    expect(await q("select first_name from profiles where id = $1", [alex.id])).toEqual([{ first_name: "Alexandra" }]);
    expect(await kidsOf(alex.id)).toEqual([
      { first_name: "Mia", age_label: "6", sort: 0 },
      { first_name: "Leo", age_label: "baby", sort: 1 },
    ]);
    expect(await q("select id from children where parent_id = $1 and first_name = 'Mia'", [alex.id])).toEqual([{ id: mia!.id }]); // same row
  });

  it("never touches another parent's child: its id becomes a new child of this parent", async () => {
    const alex = await parent();
    const sam = await parent("Sam", ["Zoe"]);
    const zoe = sam.kids[0]!;
    await save(alex.id, "Alex", [{ id: zoe.id, first_name: "Mine", age_label: "3", sort: 0 }]);
    expect(await kidsOf(sam.id)).toEqual([{ first_name: "Zoe", age_label: "5", sort: 0 }]);
    expect(await kidsOf(alex.id)).toEqual([{ first_name: "Mine", age_label: "3", sort: 0 }]);
  });

  it("keeps at least one child and the name and age rules, and says false with no profile", async () => {
    const alex = await parent();
    expect(await failsAs("service", `select update_profile_with_children('${alex.id}', 'Alex', '[]'::jsonb)`)).toBe(CHECK);
    expect(await failsAs("service", `select update_profile_with_children('${alex.id}', 'Alex', '[{"first_name":"Mia","age_label":"old","sort":0}]'::jsonb)`)).toBe(CHECK);
    expect(await kidsOf(alex.id)).toHaveLength(2);
    expect(await save(randomUUID(), "Nobody", [{ first_name: "Mia", age_label: "5", sort: 0 }])).toEqual([{ ok: false }]);
  });
});
