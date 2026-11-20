// T55: Download my data (src/lib/db/my-data.ts) through the local Supabase API with the service role: only the parent's own data,
// and no hash, token or account id anywhere in it. Skipped unless scripts/test-db.sh could give it the local API.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiEnabled, closeDb, q } from "./helpers";

describe.skipIf(!apiEnabled)("Download my data (T55)", () => {
  const users: string[] = [];
  let myData: typeof import("@/lib/db/my-data").myData;

  async function parent(name: string, kid: string): Promise<string> {
    const id = randomUUID();
    users.push(id);
    await q("insert into auth.users (id, phone) values ($1, $2)", [id, `1${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`]);
    await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [id, name, `secret-hash-${id}`]);
    await q("insert into children (parent_id, first_name, age_label) values ($1, $2, '5')", [id, kid]);
    return id;
  }

  beforeAll(async () => {
    ({ myData } = await import("@/lib/db/my-data"));
  });
  afterAll(async () => {
    await q("delete from auth.users where id = any($1)", [users]);
    await closeDb();
  });

  it("holds the parent's own profile, kids, friends, places and playdates, and nothing of another parent's", async () => {
    const alex = await parent("Alex", "Mia");
    const sam = await parent("Sam", "Zoe");
    const [f] = await q<{ id: string }>(
      "insert into friends (owner_id, parent_name, child_first_name, label, phone_hash, kindred_user_id) values ($1, 'Sam Lee', 'Zoe', 'Zoe''s parent', 'friend-secret-hash', $2) returning id",
      [alex, sam],
    );
    await q("insert into friends (owner_id, parent_name, label, phone_hash) values ($1, 'Private Friend', 'Private', 'other-hash')", [sam]);
    await q("insert into saved_places (owner_id, source, name, address) values ($1, 'typed', 'Grandma''s', '12 Oak St')", [alex]);
    await q("insert into saved_places (owner_id, source, name, address) values ($1, 'typed', 'Sam''s secret spot', '1 Hidden Rd')", [sam]);
    const [p] = await q<{ id: string }>(
      `insert into playdates (organizer_id, title, mode, start_at, end_at, message, links_expire_at)
       values ($1, 'Playdate: Mia & Zoe', 'set_time', '2030-11-15 19:00+00', '2030-11-15 21:00+00', 'Park?', '2030-11-16 09:00+00') returning id`,
      [alex],
    );
    const [i] = await q<{ id: string }>(
      "insert into invites (playdate_id, organizer_id, friend_id, channel, token_hash, invitee_user_id) values ($1, $2, $3, 'app', 'token-secret-hash', $4) returning id",
      [p!.id, alex, f!.id, sam],
    );
    await q("insert into answers (invite_id, kind, time_version) values ($1, 'yes', 1)", [i!.id]);

    const data = await myData(alex, new Date("2030-11-01T12:00:00Z"));
    expect(data.profile?.firstName).toBe("Alex");
    expect(data.children).toEqual([{ firstName: "Mia", age: "5" }]);
    expect(data.friends).toMatchObject([{ name: "Sam Lee", label: "Zoe's parent", onKindred: true }]);
    expect(data.savedPlaces).toMatchObject([{ name: "Grandma's", address: "12 Oak St" }]);
    expect(data.playdatesYouPlanned).toMatchObject([{ title: "Playdate: Mia & Zoe", message: "Park?", invited: [{ friend: "Zoe's parent", answer: { kind: "yes" } }] }]);
    expect(data.invitesYouGot).toEqual([]);

    const text = JSON.stringify(data);
    for (const secret of ["secret-hash", "friend-secret-hash", "token-secret-hash", "Private Friend", "secret spot", sam, alex, f!.id, p!.id]) {
      expect(text).not.toContain(secret);
    }

    // Sam sees the invite he got, with his answer, and none of Alex's friends or places.
    const his = await myData(sam, new Date("2030-11-01T12:00:00Z"));
    expect(his.invitesYouGot).toMatchObject([{ title: "Playdate: Mia & Zoe", from: "Alex", yourAnswer: { kind: "yes" } }]);
    expect(JSON.stringify(his)).not.toContain("Grandma");
  });
});
