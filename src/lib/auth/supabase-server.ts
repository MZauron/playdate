// The signed-in parent's session, read and written through httpOnly cookies (@supabase/ssr). Server only.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cache } from "react";
import { cookies } from "next/headers";
import { env } from "@/env";
import type { Database } from "@/lib/db/types";
import { sessionCookieOptions } from "./session-cookie-options";

/** A Supabase client acting as the signed-in parent (anon key + their session). It reads and renews nothing the parent does not own. */
export async function sessionClient() {
  const store = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // Server Components cannot set cookies; the proxy renews the session before they run, so this only matters in actions.
        try {
          for (const { name, value, options } of list) store.set(name, value, sessionCookieOptions(options, env.NODE_ENV === "production"));
        } catch {}
      },
    },
  });
}

export type CurrentUser = { id: string; phone: string | undefined };

/** The signed-in user, verified with the identity service (never trusted from a cookie alone); null when signed out. One call per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await sessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, phone: data.user.phone || undefined };
});
