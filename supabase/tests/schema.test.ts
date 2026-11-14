// The checks of docs/schema.test.sql, against a real local Supabase with its real roles and `request.jwt.claims`.
// Each test is named with the label of its check there (schema-labels.test.ts keeps the two in step).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorld, closeDb, countAs, destroyWorld, enabled, failsAs, failsAsOwner, q, type Who, type World } from "./helpers";

const CHECK = "23514";
const FOREIGN_KEY = "23503";
const UNIQUE = "23505";
const DENIED = "42501";

describe.skipIf(!enabled)("schema checks (docs/schema.test.sql)", () => {
  let w: World;
  beforeAll(async () => {
    w = await buildWorld();
  });
  afterAll(async () => {
    if (w) await destroyWorld(w);
    await closeDb();
  });
  const user = (id: string): Who => ({ userId: id });

  describe("constraints (as owner)", () => {
    const newPlaydate = (mode: string, start: string, end: string, message: string) =>
      `insert into playdates (organizer_id, title, mode, start_at, end_at, message, links_expire_at)
       values ('${w.alex}', 't', '${mode}', ${start}, ${end}, '${message}', now())`;

    it("KD-03 end after start", async () => {
      expect(await failsAsOwner(newPlaydate("set_time", "'2030-11-15 21:00+00'", "'2030-11-15 19:00+00'", "hi"))).toBe(CHECK);
    });
    it("KD-02 availability has no set time", async () => {
      expect(await failsAsOwner(newPlaydate("availability", "'2030-11-15 19:00+00'", "'2030-11-15 21:00+00'", "hi"))).toBe(CHECK);
    });
    it("KD-05 message required", async () => {
      expect(await failsAsOwner(newPlaydate("set_time", "'2030-11-15 19:00+00'", "'2030-11-15 21:00+00'", "   "))).toBe(CHECK);
    });
    it("KD-01 confirmed needs a final time", async () => {
      expect(await failsAsOwner(`update playdates set status = 'confirmed' where id = '${w.playdate}'`)).toBe(CHECK);
    });
    it("pick needs a range", async () => {
      expect(
        await failsAsOwner(
          `insert into answers (invite_id, kind, time_version) values ('${w.inviteAisha}', 'pick', 1) on conflict (invite_id) do update set kind = 'pick'`,
        ),
      ).toBe(CHECK);
    });
    it("a decline needs a reason", async () => {
      expect(await failsAsOwner(`update answers set reason = null where invite_id = '${w.inviteAisha}'`)).toBe(CHECK);
    });
    it("invite only your own friend", async () => {
      expect(
        await failsAsOwner(
          `insert into invites (playdate_id, organizer_id, friend_id, channel, token_hash) values ('${w.playdate}', '${w.alex}', '${w.friendMayaOfXan}', 'text', 't9-${w.tag}')`,
        ),
      ).toBe(FOREIGN_KEY);
    });
    it("invite only to your own playdate", async () => {
      expect(
        await failsAsOwner(
          `insert into invites (playdate_id, organizer_id, friend_id, channel, token_hash) values ('${w.playdate}', '${w.xan}', '${w.friendMayaOfXan}', 'text', 't9-${w.tag}')`,
        ),
      ).toBe(FOREIGN_KEY);
    });
    it("app invite needs the account", async () => {
      expect(
        await failsAsOwner(
          `insert into invites (playdate_id, organizer_id, friend_id, channel, token_hash) values ('${w.playdate}', '${w.alex}', '${w.friendDev}', 'app', 't9-${w.tag}')`,
        ),
      ).toBe(CHECK);
    });
    it("one invite per friend per playdate", async () => {
      expect(
        await failsAsOwner(
          `insert into invites (playdate_id, organizer_id, friend_id, invitee_user_id, channel, token_hash) values ('${w.playdate}', '${w.alex}', '${w.friendDev}', '${w.dev}', 'app', 't9-${w.tag}')`,
        ),
      ).toBe(UNIQUE);
    });
    it("group holds only your friends", async () => {
      expect(await failsAsOwner(`insert into group_members values ('${w.group}', '${w.friendMayaOfXan}', '${w.alex}')`)).toBe(FOREIGN_KEY);
    });
    it("typed place needs an address", async () => {
      expect(await failsAsOwner(`insert into saved_places (owner_id, source, name) values ('${w.alex}', 'typed', 'Home')`)).toBe(CHECK);
    });
  });

  describe("as Alex (organizer)", () => {
    const alex = () => user(w.alex);
    it("organizer sees playdate", async () => expect(await countAs(alex(), "select * from playdates")).toBe(1));
    it("organizer sees both invites", async () => expect(await countAs(alex(), "select id from invites")).toBe(2));
    it("organizer sees both answers", async () => expect(await countAs(alex(), "select * from answers")).toBe(2));
    it("organizer sees own friends only", async () => expect(await countAs(alex(), "select id from friends")).toBe(2));
    it("organizer sees own profile only", async () => expect(await countAs(alex(), "select id, first_name from profiles")).toBe(1));
    it("phone_hash hidden", async () => expect(await failsAs(alex(), "select phone_hash from profiles")).toBe(DENIED));
    it("token_hash hidden", async () => expect(await failsAs(alex(), "select token_hash from invites")).toBe(DENIED));
    it("friend phone_hash hidden", async () => expect(await failsAs(alex(), "select phone_hash from friends")).toBe(DENIED));
    it("no direct playdate writes", async () => {
      const sql = `insert into playdates (organizer_id, title, mode, start_at, end_at, message, links_expire_at)
                   values ('${w.alex}', 't', 'set_time', now(), now() + interval '1h', 'hi', now())`;
      expect(await failsAs(alex(), sql)).toBe(DENIED);
    });
    it("no direct answer writes", async () => expect(await failsAs(alex(), "update answers set kind = 'yes'")).toBe(DENIED));
    it("clients never add friends", async () => {
      const sql = `insert into friends (owner_id, parent_name, label, phone_e164, phone_hash) values ('${w.alex}', 'x', 'x', '+14165550111', 'hq')`;
      expect(await failsAs(alex(), sql)).toBe(DENIED);
    });
    it("clients never write children, even their own", async () => {
      expect(await failsAs(alex(), `insert into children (parent_id, first_name, age_label) values ('${w.alex}', 'Leo', 'baby')`)).toBe(DENIED);
    });
    it("clients never write saved places", async () => {
      const sql = `insert into saved_places (owner_id, source, name, address) values ('${w.alex}', 'typed', 'Our place', '12 Elm St')`;
      expect(await failsAs(alex(), sql)).toBe(DENIED);
    });
    it("clients never write groups", async () => {
      expect(await failsAs(alex(), `insert into groups (owner_id, name) values ('${w.alex}', 'x')`)).toBe(DENIED);
    });
    it("clients never update profiles", async () => {
      expect(await failsAs(alex(), `update profiles set first_name = 'Alexandra' where id = '${w.alex}'`)).toBe(DENIED);
    });
    it("clients never delete friends", async () => expect(await failsAs(alex(), "delete from friends")).toBe(DENIED));
    it("organizer reads own children", async () => expect(await countAs(alex(), "select * from children")).toBe(1));
  });

  describe("as Dev (invited, has the app)", () => {
    const dev = () => user(w.dev);
    it("invitee sees the playdate", async () => expect(await countAs(dev(), "select * from playdates")).toBe(1));
    it("invitee sees only own invite", async () => expect(await countAs(dev(), "select id from invites")).toBe(1));
    it("invitee sees only own answer", async () => expect(await countAs(dev(), "select * from answers")).toBe(1));
    it("invitee sees self + organizer first name", async () => expect(await countAs(dev(), "select id, first_name from profiles")).toBe(2));
    it("invitee cannot see organizer children", async () => expect(await countAs(dev(), "select * from children")).toBe(0));
    it("invitee cannot see organizer friends", async () => expect(await countAs(dev(), "select id from friends")).toBe(0));
    it("invitee cannot see saved places (home address)", async () => expect(await countAs(dev(), "select * from saved_places")).toBe(0));
    it("invitee cannot rename organizer", async () => {
      expect(await failsAs(dev(), `update profiles set first_name = 'Hacked' where id = '${w.alex}'`)).toBe(DENIED);
    });
  });

  describe("as Maya (friend of someone else, not invited) and Xan", () => {
    const maya = () => user(w.maya);
    it("uninvited sees nothing", async () => expect(await countAs(maya(), "select * from playdates")).toBe(0));
    it("uninvited sees no invites", async () => expect(await countAs(maya(), "select id from invites")).toBe(0));
    it("uninvited sees no answers", async () => expect(await countAs(maya(), "select * from answers")).toBe(0));
    it("uninvited sees only self", async () => expect(await countAs(maya(), "select id from profiles")).toBe(1));
    it("Xan sees own friend list (Maya) only", async () => expect(await countAs(user(w.xan), "select id from friends")).toBe(1));
    it("groups are private", async () => expect(await countAs(user(w.xan), "select * from groups")).toBe(0));
  });

  describe("anon", () => {
    it("anon reads nothing", async () => expect(await failsAs("anon", "select * from playdates")).toBe(DENIED));
    it("anon no profiles", async () => expect(await failsAs("anon", "select id from profiles")).toBe(DENIED));
  });

  // Last: it deletes part of the world.
  describe("cascades", () => {
    it("removing a friend drops their invite and answer", async () => {
      await q("delete from friends where id = $1", [w.friendAisha]);
      expect(await q("select * from answers where invite_id = $1", [w.inviteAisha])).toEqual([]);
      expect(await q("select * from invites where id = $1", [w.inviteAisha])).toEqual([]);
    });
  });
});
