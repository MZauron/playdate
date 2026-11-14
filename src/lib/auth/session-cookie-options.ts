import type { CookieOptions } from "@supabase/ssr";

/** Session cookies are never readable by scripts; the browser Supabase client (Realtime, T10) gets its token from the server instead. */
export function sessionCookieOptions(options: CookieOptions, production: boolean): CookieOptions {
  return { ...options, httpOnly: true, sameSite: "lax", secure: production, path: "/" };
}
