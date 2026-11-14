// create_profile_with_children (migration 0002): the server's one-step Setup. Only the service role may call it.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, closeDb, enabled, failsAs, q, type Who } from "./helpers";

const FOREIGN_KEY_OR_CHECK = "23514";
const UNIQUE = "23505";
const DENIED = "42501";

describe.skipIf(!enabled)("create_profile_with_children", () => {
  const users: string[] = [];
  const newUser = async () => {
    const id = randomUUID();
    users.push(id);
    await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1416${Math.floor(1_000_000 + Math.random() * 8_999_999)}`]);
    return id;
  };
  const call = (who: Who, id: string, hash: string, children: object[], name = "Alex") =>
    failsAs(who, `select create_profile_with_children('${id}', '${name}', '${hash}', '${JSON.stringify(children)}'::jsonb)`);
  const mia = { first_name: "Mia", age_label: "5", sort: 0 };

  afterAll(async () => {
    await q("delete from auth.users where id = any($1)", [users]);
    await closeDb();
  });
  beforeAll(() => undefined);

  it("writes the parent and their children, in order, for the service role", async () => {
    const id = await newUser();
    const children = [mia, { first_name: "Leo", age_label: "baby", sort: 1 }];
    // Not rolled back: run through the service role inside a real transaction we commit by using the owner connection afterwards.
    const result = await as("service", async (query) => {
      await query("select create_profile_with_children($1, 'Alex', $2, $3::jsonb)", [id, `h-${id}`, JSON.stringify(children)]);
      return {
        profile: await query<{ first_name: string; phone_hash: string }>("select first_name, phone_hash from profiles where id = $1", [id]),
        kids: await query<{ first_name: string; age_label: string; sort: number }>("select first_name, age_label, sort from children where parent_id = $1 order by sort", [id]),
      };
    });
    expect(result.profile).toEqual([{ first_name: "Alex", phone_hash: `h-${id}` }]);
    expect(result.kids).toEqual([{ first_name: "Mia", age_label: "5", sort: 0 }, { first_name: "Leo", age_label: "baby", sort: 1 }]);
  });

  it("is not callable by anon or by a signed-in parent, even for themselves", async () => {
    const id = await newUser();
    expect(await call("anon", id, `h-${id}`, [mia])).toBe(DENIED);
    expect(await call({ userId: id }, id, `h-${id}`, [mia])).toBe(DENIED);
    expect(await q("select id from profiles where id = $1", [id])).toEqual([]);
  });

  it("happens once per parent", async () => {
    const id = await newUser();
    await q("select create_profile_with_children($1, 'Alex', $2, $3::jsonb)", [id, `h-${id}`, JSON.stringify([mia])]);
    expect(await call("service", id, `h2-${id}`, [mia])).toBe(UNIQUE);
    expect(await q("select first_name from profiles where id = $1", [id])).toEqual([{ first_name: "Alex" }]);
    expect(await q("select id from children where parent_id = $1", [id])).toHaveLength(1);
  });

  it("refuses a phone hash that already belongs to another parent", async () => {
    const first = await newUser();
    const second = await newUser();
    await q("select create_profile_with_children($1, 'Alex', $2, $3::jsonb)", [first, `same-${first}`, JSON.stringify([mia])]);
    expect(await call("service", second, `same-${first}`, [mia], "Sam")).toBe(UNIQUE);
    expect(await q("select id from profiles where id = $1", [second])).toEqual([]);
  });

  it("is all or nothing: a bad child leaves no profile behind", async () => {
    const id = await newUser();
    expect(await call("service", id, `h-${id}`, [mia, { first_name: "Leo", age_label: "five", sort: 1 }])).toBe(FOREIGN_KEY_OR_CHECK);
    expect(await call("service", id, `h-${id}`, [{ first_name: "  ", age_label: "5", sort: 0 }])).toBe(FOREIGN_KEY_OR_CHECK);
    expect(await call("service", id, `h-${id}`, [mia], "   ")).toBe(FOREIGN_KEY_OR_CHECK);
    expect(await q("select id from profiles where id = $1", [id])).toEqual([]);
    expect(await q("select id from children where parent_id = $1", [id])).toEqual([]);
  });

  it("refuses a parent that has no account", async () => {
    expect(await call("service", randomUUID(), "h-ghost", [mia])).toBe("23503");
  });
});
