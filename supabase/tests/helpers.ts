// From MZauron/aquatix supabase/tests/helpers.ts @ 4a87d68 (Aquatix's world replaced by Kindred's).
// Shared by the database tests. They talk to a real local Postgres (Supabase's, via scripts/test-db.sh) and are skipped unless
// `KD_DB_TESTS=1`, so `npm test` needs no database.
//
// Every run makes its own parents, friends and playdates with random ids and deletes them afterwards: nothing seeded is
// touched and two runs cannot disturb each other. Reads "as a role" work the way Supabase's Data API does: inside a transaction,
// `set local role` plus the JWT claims `auth.uid()` reads, so what they prove is what production enforces.
import { randomBytes, randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

export const enabled = process.env.KD_DB_TESTS === "1";
/** The repository tests also need the local Supabase API (scripts/test-db.sh sets this when the CLI is there). */
export const apiEnabled = enabled && process.env.KD_LOCAL_API === "1";

let pool: Pool | undefined;
export const db = (): Pool => {
  const connectionString = process.env.KD_DB_URL;
  if (!connectionString) throw new Error("KD_DB_URL is not set: run these tests with scripts/test-db.sh");
  return (pool ??= new Pool({ connectionString, max: 8 }));
};
export const closeDb = async () => {
  await pool?.end();
  pool = undefined;
};

type Params = unknown[];
/** A query as the database owner (bypasses row-level security), for building worlds and for the constraint tests. */
export async function q<T extends QueryResultRow = Record<string, unknown>>(sql: string, params: Params = []): Promise<T[]> {
  return (await db().query<T>(sql, params)).rows;
}

/** The SQLSTATE (and message) a statement fails with, or null when it succeeds. */
export async function failure(run: Promise<unknown>): Promise<{ code: string; message: string } | null> {
  try {
    await run;
    return null;
  } catch (error) {
    const { code, message } = error as { code?: string; message: string };
    return { code: code ?? "", message };
  }
}

export type Who = "anon" | "service" | { userId: string };
type Query = <R extends QueryResultRow = Record<string, unknown>>(sql: string, params?: Params) => Promise<R[]>;

/** Runs `fn` inside a transaction as a Data API role, then rolls back. `{ userId }` is a signed-in parent (role `authenticated`). */
export async function as<T>(who: Who, fn: (query: Query) => Promise<T>): Promise<T> {
  const client: PoolClient = await db().connect();
  try {
    await client.query("begin");
    const role = who === "anon" ? "anon" : who === "service" ? "service_role" : "authenticated";
    await client.query(`set local role ${role}`);
    if (typeof who === "object") {
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who.userId, role: "authenticated" })]);
    }
    return await fn(async (sql, params = []) => (await client.query(sql, params)).rows);
  } finally {
    await client.query("rollback").catch(() => undefined);
    client.release();
  }
}

/** How many rows a role sees for a query. */
export const countAs = (who: Who, sql: string): Promise<number> => as(who, async (query) => (await query(sql)).length);

/** The SQLSTATE a statement fails with when run as a role, or null when it succeeds. */
export const failsAs = async (who: Who, sql: string): Promise<string | null> => (await as(who, (query) => failure(query(sql))))?.code ?? null;

/** The SQLSTATE a statement fails with when run as the owner, or null when it succeeds. */
export const failsAsOwner = async (sql: string): Promise<string | null> => (await failure(q(sql)))?.code ?? null;

const phone = () => `+1${(1_000_000_000 + (randomBytes(4).readUInt32BE() % 9_000_000_000)).toString()}`;

export type World = Awaited<ReturnType<typeof buildWorld>>;

/**
 * The world of docs/schema.test.sql, with fresh ids. Parents: Alex (organizer), Dev (invited, has Kindred), Maya (has Kindred,
 * not invited; a friend of Xan's), Xan (a stranger to Alex). Alex has a child Mia, friends Dev (app) and Aisha (text, no account),
 * a group, and one set-time playdate inviting both; Dev answered yes, Aisha no (busy, "sorry!").
 */
export async function buildWorld() {
  const id = () => randomUUID();
  const w = {
    alex: id(), dev: id(), maya: id(), xan: id(),
    friendDev: id(), friendAisha: id(), friendMayaOfXan: id(),
    playdate: id(), inviteDev: id(), inviteAisha: id(), group: id(),
    tag: randomUUID().slice(0, 8),
  };
  const users: [string, string][] = [[w.alex, "Alex"], [w.dev, "Dev"], [w.maya, "Maya"], [w.xan, "Xan"]];
  for (const [user, name] of users) {
    await q("insert into auth.users (id, phone) values ($1, $2)", [user, phone()]);
    await q("insert into profiles (id, first_name, phone_hash) values ($1, $2, $3)", [user, name, `h${name}-${w.tag}`]);
  }
  await q("insert into children (parent_id, first_name, age_label) values ($1, 'Mia', '5')", [w.alex]);
  await q(
    `insert into friends (id, owner_id, parent_name, child_first_name, label, phone_hash, kindred_user_id) values
     ($1, $2, 'Dev Patel', 'Arjun', 'Arjun''s dad', $3, $4),
     ($5, $2, 'Aisha Rahman', 'Zara', 'Zara''s mom', $6, null),
     ($7, $8, 'Maya', 'Lily', 'Lily''s mom', $9, $10)`,
    [w.friendDev, w.alex, `hDev-${w.tag}`, w.dev, w.friendAisha, `hZ-${w.tag}`, w.friendMayaOfXan, w.xan, `hMaya-${w.tag}`, w.maya],
  );
  await q("insert into groups (id, owner_id, name) values ($1, $2, 'Dance friends')", [w.group, w.alex]);
  await q(
    `insert into playdates (id, organizer_id, title, mode, start_at, end_at, message, links_expire_at)
     values ($1, $2, 'Playdate: Mia, Arjun & Zara', 'set_time', '2030-11-15 19:00+00', '2030-11-15 21:00+00', 'Hey! Park on Sunday?', '2030-11-16 09:00+00')`,
    [w.playdate, w.alex],
  );
  await q(
    `insert into invites (id, playdate_id, organizer_id, friend_id, invitee_user_id, channel, token_hash) values
     ($1, $2, $3, $4, $5, 'app', $6), ($7, $2, $3, $8, null, 'text', $9)`,
    [w.inviteDev, w.playdate, w.alex, w.friendDev, w.dev, `t1-${w.tag}`, w.inviteAisha, w.friendAisha, `t2-${w.tag}`],
  );
  await q("insert into answers (invite_id, kind, time_version) values ($1, 'yes', 1)", [w.inviteDev]);
  await q("insert into answers (invite_id, kind, reason, note, time_version) values ($1, 'no', 'busy', 'sorry!', 1)", [w.inviteAisha]);
  return w;
}

/** Deletes everything a world made: removing the users cascades to profiles and everything they own (account-deletion.test.ts). */
export async function destroyWorld(w: World): Promise<void> {
  await q("delete from auth.users where id = any($1)", [[w.alex, w.xan, w.dev, w.maya]]);
}
