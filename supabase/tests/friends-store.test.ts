// The real friends repository (src/lib/db/friends.ts) through the local Supabase API with the service role: what the SQL actually
// does with owners, duplicates, matching and cascades. Skipped unless scripts/test-db.sh could give it the local API.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, q } from "./helpers";

describe.skipIf(!apiEnabled)("friends repository", () => {
  const owners: string[] = [];
  let repo: typeof import("@/lib/db/friends");
  let domain: typeof import("@/lib/domain/friends");
  let phoneHash: (key: string, e164: string) => string;
  let key: string;
  const tag = randomUUID().slice(0, 8);

  async function parent(hash?: string): Promise<string> {
    const id = randomUUID();
    owners.push(id);
    await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
    await q("insert into profiles (id, first_name, phone_hash) values ($1, 'Test', $2)", [id, hash ?? `own-${id}`]);
    return id;
  }
  const dev = (phone: string) => ({ name: "Dev Patel", childName: "Arjun", phone });
  const add = (ownerId: string, phone: string) =>
    domain.addFriend({ store: repo.friendStore, phoneHashKey: key, limiter: { hit: () => ({ ok: true }) } }, ownerId, dev(phone));

  beforeAll(async () => {
    repo = await import("@/lib/db/friends");
    domain = await import("@/lib/domain/friends");
    ({ phoneHash } = await import("@/lib/phone"));
    key = (await import("@/env")).env.PHONE_HASH_KEY;
  });
  afterAll(async () => {
    await q("delete from auth.users where id = any($1)", [owners]);
    await closeDb();
  });

  it("adds a friend for the owner and lists only that owner's friends, without any number or hash", async () => {
    const alex = await parent();
    const sam = await parent();
    expect((await add(alex, `(416) 555-${tag.replace(/\D/g, "0").slice(0, 4).padEnd(4, "1")}`)).ok).toBe(true);
    const list = await repo.listFriends(alex);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ parentName: "Dev Patel", childFirstName: "Arjun", label: "Arjun's parent", hasKindred: false });
    expect(Object.keys(list[0]!).sort()).toEqual(["childFirstName", "childIds", "hasKindred", "id", "label", "parentName"]); // childIds: which of your kids they know (T42)
    expect(await repo.listFriends(sam)).toEqual([]);
  });

  it("stores the E.164 number and the HMAC, and refuses the same number twice for one owner only", async () => {
    const alex = await parent();
    const sam = await parent();
    const number = "+14165550123";
    expect((await add(alex, "(416) 555-0123")).ok).toBe(true);
    // Q26: only the keyed hash is stored; the number itself has no column any more.
    const row = await q<Record<string, unknown>>("select * from friends where owner_id = $1", [alex]);
    expect(row).toHaveLength(1);
    expect(row[0]!.phone_hash).toBe(phoneHash(key, number));
    expect(JSON.stringify(row)).not.toContain(number.slice(2));
    expect(await add(alex, "416-555-0123")).toMatchObject({ ok: false, code: "DUPLICATE", existingLabel: "Arjun's parent" });
    expect((await add(sam, "416-555-0123")).ok).toBe(true);
  });

  it("matches a number that belongs to a Kindred parent when it is added", async () => {
    const alex = await parent();
    const devUser = await parent(phoneHash(key, "+14165550124"));
    const result = await add(alex, "416 555 0124");
    expect(result.ok && result.friend.hasKindred).toBe(true);
    expect(await q("select kindred_user_id from friends where owner_id = $1", [alex])).toEqual([{ kindred_user_id: devUser }]);
  });

  it("turns a text friend into a Kindred friend once that parent has joined, for this owner only", async () => {
    const alex = await parent();
    const sam = await parent();
    await add(alex, "416 555 0125");
    await add(sam, "416 555 0125");
    expect((await repo.listFriends(alex))[0]!.hasKindred).toBe(false);
    const joined = await parent(phoneHash(key, "+14165550125"));
    expect((await repo.listFriends(alex))[0]!.hasKindred).toBe(true);
    expect(await q("select kindred_user_id from friends where owner_id = $1", [alex])).toEqual([{ kindred_user_id: joined }]);
    expect(await q("select kindred_user_id from friends where owner_id = $1", [sam])).toEqual([{ kindred_user_id: null }]); // not refreshed until Sam looks
    expect((await repo.listFriends(sam))[0]!.hasKindred).toBe(true);
  });

  it("never makes a parent their own friend, and refuses their own number at the door", async () => {
    const alex = await parent(phoneHash(key, "+14165550126"));
    expect(await add(alex, "416 555 0126")).toMatchObject({ ok: false, code: "OWN_NUMBER" });
    // Even a row that slipped in (an older friend whose number later became the owner's own) is left a text friend, not matched to self.
    await q("insert into friends (owner_id, parent_name, label, phone_hash) values ($1, 'Me', 'Me', $2)", [alex, phoneHash(key, "+14165550126")]);
    await expect(repo.listFriends(alex)).resolves.toHaveLength(1);
    expect(await q("select kindred_user_id from friends where owner_id = $1", [alex])).toEqual([{ kindred_user_id: null }]);
  });

  it("renames and removes only the owner's own friend, whatever id is sent", async () => {
    const alex = await parent();
    const sam = await parent();
    await add(alex, "416 555 0127");
    await add(sam, "416 555 0127");
    const [alexFriend] = await repo.listFriends(alex);
    const [samFriend] = await repo.listFriends(sam);
    expect(await repo.friendStore.renameFriend(alex, samFriend!.id, "Stolen")).toBe(false);
    expect(await repo.friendStore.deleteFriend(alex, samFriend!.id)).toBe(false);
    expect((await repo.listFriends(sam))[0]!.label).toBe("Arjun's parent");
    expect(await repo.friendStore.renameFriend(alex, alexFriend!.id, "Arjun's dad")).toBe(true);
    expect((await repo.listFriends(alex))[0]!.label).toBe("Arjun's dad");
    expect(await repo.friendStore.deleteFriend(alex, alexFriend!.id)).toBe(true);
    expect(await repo.listFriends(alex)).toEqual([]);
    expect(await repo.listFriends(sam)).toHaveLength(1);
  });

  it("removing a friend takes their invites and answers with it", async () => {
    const alex = await parent();
    await add(alex, "416 555 0128");
    const [friend] = await repo.listFriends(alex);
    const playdate = randomUUID();
    const invite = randomUUID();
    await q(
      `insert into playdates (id, organizer_id, title, mode, start_at, end_at, message, links_expire_at)
       values ($1, $2, 'Playdate: A & B', 'set_time', '2030-11-15 19:00+00', '2030-11-15 21:00+00', 'Hi', '2030-11-16 09:00+00')`,
      [playdate, alex],
    );
    await q("insert into invites (id, playdate_id, organizer_id, friend_id, channel, token_hash) values ($1, $2, $3, $4, 'text', $5)", [invite, playdate, alex, friend!.id, `t-${invite}`]);
    await q("insert into answers (invite_id, kind, time_version) values ($1, 'yes', 1)", [invite]);
    expect(await repo.friendStore.deleteFriend(alex, friend!.id)).toBe(true);
    expect(await q("select id from invites where id = $1", [invite])).toEqual([]);
    expect(await q("select invite_id from answers where invite_id = $1", [invite])).toEqual([]);
  });

  it("opens only the owner's own friend, and lists the playdates together: open soonest first, past confirmed ones newest first (T40)", async () => {
    const alex = await parent();
    const sam = await parent();
    const [f] = await q<{ id: string }>(
      "insert into friends (owner_id, parent_name, child_first_name, label, phone_hash) values ($1, 'Dev Patel', 'Arjun', 'Arjun''s dad', $2) returning id",
      [alex, `h-${randomUUID()}`],
    );
    const friendId = f!.id;
    expect((await repo.getFriend(alex, friendId))?.label).toBe("Arjun's dad");
    expect(await repo.getFriend(sam, friendId)).toBeNull();

    const playdate = async (start: string, status: "collecting" | "confirmed" | "cancelled", expires: string) => {
      const s0 = new Date(start);
      const e0 = new Date(s0.getTime() + 7_200_000);
      const confirmed = status === "confirmed";
      const [p] = await q<{ id: string }>(
        `insert into playdates (organizer_id, title, mode, status, start_at, end_at, final_start_at, final_end_at, confirmed_at, cancelled_at, message, links_expire_at)
         values ($1, 'Playdate: Mia & Arjun', 'set_time', $2::playdate_status, $3, $4, $5, $6, $7, $8, 'Park?', $9) returning id`,
        [alex, status, s0, e0, confirmed ? s0 : null, confirmed ? e0 : null, confirmed ? s0 : null, status === "cancelled" ? s0 : null, expires],
      );
      await q("insert into invites (playdate_id, organizer_id, friend_id, channel, token_hash) values ($1, $2, $3, 'text', $4)", [p!.id, alex, friendId, `t-${randomUUID()}`]);
      return p!.id;
    };
    const later = await playdate("2030-11-28T15:00:00Z", "collecting", "2030-11-29T05:00:00Z");
    const sooner = await playdate("2030-11-21T15:00:00Z", "confirmed", "2030-11-22T05:00:00Z");
    const pastOld = await playdate("2030-10-03T15:00:00Z", "confirmed", "2030-10-04T05:00:00Z");
    const pastNew = await playdate("2030-10-17T15:00:00Z", "confirmed", "2030-10-18T05:00:00Z");
    await playdate("2030-10-24T15:00:00Z", "collecting", "2030-10-25T05:00:00Z"); // over, never confirmed
    await playdate("2030-11-25T15:00:00Z", "cancelled", "2030-11-26T05:00:00Z");
    const together = await repo.playdatesWithFriend(alex, friendId, new Date("2030-11-01T12:00:00Z"));
    expect(together.open.map((p) => p.id)).toEqual([sooner, later]);
    expect(together.past.map((p) => p.id)).toEqual([pastNew, pastOld]);
    expect(await repo.playdatesWithFriend(sam, friendId, new Date("2030-11-01T12:00:00Z"))).toEqual({ open: [], past: [] });
  });
});
