// The ONLY place that talks to Supabase with the service role (CLAUDE.md "Layout"). Server only: the key must never reach a client.
// Every caller passes the signed-in parent's id from `auth.getUser()`; this client bypasses RLS, so scoping is the caller's job.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { Database } from "./types";

export type AdminClient = SupabaseClient<Database>;

let client: AdminClient | undefined;

export function adminClient(): AdminClient {
  client ??= createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
