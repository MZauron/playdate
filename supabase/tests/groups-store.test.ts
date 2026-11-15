// Groups (T19) against the real database: save_group (migration 0007) is server only and refuses another parent's friend; the
// repository creates, edits, removes a member (the friend stays) and deletes (the friends stay); groups are the owner's only.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const FOREIGN_KEY = "23503";
const users: string[] = [];
async function parent(): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Alex', $2)", [id, `own-${id}`]);
  return id;
}
async function friend(ownerId: string, name: string): Promise<string> {
  const rows = await q<{ id: string }>(
    "insert into friends (owner_id, parent_name, child_first_name, label, phone_e164, phone_hash) values ($1, $2, 'Kid', $3, $4, $5) returning id",
    [ownerId, name, `${name}'s family`, `+1416555${Math.floor(1000 + Math.random() * 8999)}`, `h-${randomUUID()}`],
  );
  return rows[0]!.id;
}

afterAll(async () => {
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("save_group (migration 0007)", () => {
  it("is not callable by anon or by a signed-in parent", async () => {
    const alex = await parent();
    const sql = `select save_group('${alex}', null, 'Dance', '{}'::uuid[])`;
    expect(await failsAs("anon", sql)).toBe(DENIED);
    expect(await failsAs({ userId: alex }, sql)).toBe(DENIED);
  });
  it("refuses another parent's friend in your group, and writes nothing", async () => {
    const alex = await parent();
    const sam = await parent();
    const samsFriend = await friend(sam, "Zoe");
    expect(await failsAs("service", `select save_group('${alex}', null, 'Dance', array['${samsFriend}']::uuid[])`)).toBe(FOREIGN_KEY);
    expect(await q("select id from groups where owner_id = $1", [alex])).toEqual([]);
  });
});

describe.skipIf(!apiEnabled)("groups repository (T19)", () => {
  let db: typeof import("@/lib/db/groups");
  let domain: typeof import("@/lib/domain/groups");
  beforeAll(async () => {
    db = await import("@/lib/db/groups");
    domain = await import("@/lib/domain/groups");
  });

  it("creates, edits, removes a member and deletes; friends stay; another parent sees nothing", async () => {
    const alex = await parent();
    const sam = await parent();
    const [dev, maya, aisha] = [await friend(alex, "Dev"), await friend(alex, "Maya"), await friend(alex, "Aisha")];
    const samsFriend = await friend(sam, "Zoe");

    const created = await domain.saveGroup(db.groupStore, alex, null, { name: "Dance friends", friendIds: [dev, maya, samsFriend] });
    if (!created.ok) throw new Error(created.code);
    expect((await db.getGroup(alex, created.groupId))?.members.map((m) => m.friendId).sort()).toEqual([dev, maya].sort());
    expect(await db.getGroup(sam, created.groupId)).toBeNull();
    expect(await db.listGroups(sam)).toEqual([]);
    expect(await domain.saveGroup(db.groupStore, sam, created.groupId, { name: "Mine now", friendIds: [samsFriend] })).toEqual({ ok: false, code: "NOT_FOUND" });

    await domain.saveGroup(db.groupStore, alex, created.groupId, { name: "Ballet", friendIds: [maya, aisha] });
    const edited = await db.getGroup(alex, created.groupId);
    expect(edited?.name).toBe("Ballet");
    expect(edited?.members.map((m) => m.friendId).sort()).toEqual([maya, aisha].sort());

    expect(await domain.removeMember(db.groupStore, alex, created.groupId, maya)).toEqual({ ok: true });
    expect((await db.getGroup(alex, created.groupId))?.members.map((m) => m.friendId)).toEqual([aisha]);
    expect(await q("select id from friends where id = $1", [maya])).toEqual([{ id: maya }]); // still a friend

    const listed = await db.listGroups(alex);
    expect(listed.map((g) => ({ name: g.name, memberCount: g.memberCount, friendIds: g.friendIds }))).toEqual([{ name: "Ballet", memberCount: 1, friendIds: [aisha] }]);

    expect(await domain.deleteGroup(db.groupStore, sam, created.groupId)).toEqual({ ok: false });
    expect(await domain.deleteGroup(db.groupStore, alex, created.groupId)).toEqual({ ok: true });
    expect(await db.listGroups(alex)).toEqual([]);
    expect(await q<{ n: number }>("select count(*)::int as n from friends where owner_id = $1", [alex])).toEqual([{ n: 3 }]);
  });
});
