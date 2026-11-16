// Guarantees that hold for every table, including ones later migrations add (CLAUDE.md "Privacy" and "NEVER do").
// Supabase grants new public tables to anon and authenticated by default, so a migration that forgets to revoke fails here.
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, enabled, q } from "./helpers";

describe.skipIf(!enabled)("privileges on every table", () => {
  afterAll(closeDb);

  it("row-level security is on for every table of the public schema", async () => {
    expect(await q("select tablename from pg_tables where schemaname = 'public' and not rowsecurity")).toEqual([]);
  });

  it("anon has no privilege on any table", async () => {
    const rows = await q(
      `select table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'
       union all
       select table_name, privilege_type from information_schema.column_privileges where table_schema = 'public' and grantee = 'anon'`,
    );
    expect(rows).toEqual([]);
  });

  it("authenticated can only read, never write", async () => {
    const rows = await q(
      `select table_name, privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT'
       union all
       select table_name, privilege_type from information_schema.column_privileges
       where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT'`,
    );
    expect(rows).toEqual([]);
  });

  it("the hidden columns are readable by no client", async () => {
    const rows = await q(
      `select table_name, column_name from information_schema.column_privileges
       where table_schema = 'public' and grantee in ('anon', 'authenticated')
         and (table_name, column_name) in (('profiles', 'phone_hash'), ('friends', 'phone_hash'), ('invites', 'token_hash'))`,
    );
    expect(rows).toEqual([]);
  });

  it("no table keeps a phone number of a friend (Q26, migration 0011): only the parents' own sign-in numbers in auth", async () => {
    const rows = await q(
      `select table_name, column_name from information_schema.columns
       where table_schema = 'public' and (column_name like '%phone%' or column_name like '%e164%') and column_name not like '%hash%'`,
    );
    expect(rows).toEqual([]);
  });

  it("the functions a client may call are only the three row-level-security helpers", async () => {
    // Supabase grants new functions to everyone; a migration must revoke that for anything meant for the server only.
    const rows = await q<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prokind = 'f'
         and p.prorettype <> 'trigger'::regtype -- a trigger function cannot be called directly, whoever may execute it
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
       order by p.proname`,
    );
    expect(rows.map((r) => r.proname)).toEqual(["is_invited_to", "is_organizer_of", "organizes_for_me"]);
  });

  it("Realtime publishes answers, invites and playdates", async () => {
    const rows = await q<{ tablename: string }>(
      "select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename",
    );
    expect(rows.map((r) => r.tablename)).toEqual(["answers", "check_ins", "invites", "playdates"]);
  });
});
