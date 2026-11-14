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

  it("Realtime publishes answers, invites and playdates", async () => {
    const rows = await q<{ tablename: string }>(
      "select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename",
    );
    expect(rows.map((r) => r.tablename)).toEqual(["answers", "invites", "playdates"]);
  });
});
