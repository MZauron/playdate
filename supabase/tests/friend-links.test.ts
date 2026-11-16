// Invite to Kindred (T34, migration 0012) against the real database: no client can see a link, `befriend` makes two parents friends
// on both sides (first name, first child, their own hash, their account), keeps a friend row that already exists, and through the
// repository a stopped link finds nothing. Either parent can then remove the other on their own side only.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, countAs, enabled, failsAs, q } from "./helpers";

const DENIED = "42501";
const users: string[] = [];
async function parent(firstName: string, child: string): Promise<string> {
  const id = randomUUID();
  users.push(id);
  await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
  await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, firstName, `h-${id}`]);
  await q("insert into children (parent_id, first_name, age_label) values ($1, $2, '5')", [id, child]);
  return id;
}
const friendsOf = (owner: string) =>
  q<{ parent_name: string; child_first_name: string; label: string; phone_hash: string; kindred_user_id: string }>(
    "select parent_name, child_first_name, label, phone_hash, kindred_user_id from friends where owner_id = $1 order by parent_name",
    [owner],
  );

afterAll(async () => {
  if (users.length) await q("delete from auth.users where id = any($1)", [users]);
  await closeDb();
});

describe.skipIf(!enabled)("friend_links and befriend (migration 0012)", () => {
  it("no client can read or write a link, or call befriend", async () => {
    const alex = await parent("Alex", "Mia");
    await q("insert into friend_links (owner_id, token_hash) values ($1, $2)", [alex, `t-${randomUUID()}`]);
    expect(await failsAs({ userId: alex }, "select * from friend_links")).toBe(DENIED);
    expect(await failsAs("anon", "select * from friend_links")).toBe(DENIED);
    expect(await failsAs({ userId: alex }, `insert into friend_links (owner_id, token_hash) values ('${alex}', 'x')`)).toBe(DENIED);
    expect(await failsAs({ userId: alex }, `select befriend('${alex}', '${alex}')`)).toBe(DENIED);
  });

  it("befriends both sides once, keeps an existing friend row's name, and refuses a parent with themself", async () => {
    const alex = await parent("Alex", "Mia");
    const sam = await parent("Sam", "Leo");
    expect(await q("select befriend($1, $1) as ok", [alex])).toEqual([{ ok: false }]);
    // Alex already typed Sam's number before: that row keeps "Leo's dad" and gets Sam's account.
    await q("insert into friends (owner_id, parent_name, child_first_name, label, phone_hash) values ($1, 'Sam Lee', 'Leo', 'Leo''s dad', $2)", [alex, `h-${sam}`]);
    expect(await q("select befriend($1, $2) as ok", [sam, alex])).toEqual([{ ok: true }]);
    expect(await q("select befriend($1, $2) as ok", [alex, sam])).toEqual([{ ok: true }]); // twice: nothing new
    expect(await friendsOf(alex)).toEqual([{ parent_name: "Sam Lee", child_first_name: "Leo", label: "Leo's dad", phone_hash: `h-${sam}`, kindred_user_id: sam }]);
    expect(await friendsOf(sam)).toEqual([{ parent_name: "Alex", child_first_name: "Mia", label: "Mia's parent", phone_hash: `h-${alex}`, kindred_user_id: alex }]);
    // Each sees only their own side.
    expect(await countAs({ userId: sam }, `select id from friends where owner_id = '${alex}'`)).toBe(0);
  });
});

describe.skipIf(!apiEnabled)("friend links through the repository (T34)", () => {
  let store: typeof import("@/lib/db/friend-links").friendLinkStore;
  let domain: typeof import("@/lib/domain/friend-links");
  beforeAll(async () => {
    store = (await import("@/lib/db/friend-links")).friendLinkStore;
    domain = await import("@/lib/domain/friend-links");
  });

  it("two parents become friends without a number; a stopped link stops working; either can remove the other", async () => {
    const alex = await parent("Alex", "Mia");
    const maya = await parent("Maya", "Lily");
    const open = { hit: () => ({ ok: true as const }) };
    const made = await domain.newFriendLink({ store, limiter: open, linkBase: "https://kindred.test" }, alex);
    if (!made.ok) throw new Error("expected ok");
    const token = made.url.split("/f/")[1]!;
    expect(await q("select count(*)::int as n from friend_links where token_hash = $1", [token])).toEqual([{ n: 0 }]); // never the token itself

    expect(await domain.loadFriendLink(store, token)).toEqual({ ownerId: alex, firstName: "Alex", childFirstName: "Mia" });
    expect(await domain.acceptFriendLink(store, token, maya)).toMatchObject({ ok: true });
    expect((await friendsOf(alex)).map((f) => f.kindred_user_id)).toEqual([maya]);
    expect((await friendsOf(maya)).map((f) => f.kindred_user_id)).toEqual([alex]);

    await store.removeLinks(alex);
    expect(await domain.loadFriendLink(store, token)).toBeNull();

    // Maya removes Alex on her side; Alex keeps Maya.
    await q("delete from friends where owner_id = $1", [maya]);
    expect(await friendsOf(maya)).toEqual([]);
    expect(await friendsOf(alex)).toHaveLength(1);
  });
});
