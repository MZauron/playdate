import type { CookieOptions } from "@supabase/ssr";

/**
 * Cookies are Secure when the site itself is served over https (`PUBLIC_LINK_BASE`, the site's own address): staging and production.
 * A local production build on http://localhost (the smoke test, T11) cannot keep Secure cookies in every browser (Linux WebKit drops
 * them), so it must not ask for them there.
 */
export function secureSite(siteUrl: string): boolean {
  return siteUrl.startsWith("https://");
}

/** Session cookies are never readable by scripts; the browser Supabase client (Realtime, T10) gets its token from the server instead. */
export function sessionCookieOptions(options: CookieOptions, production: boolean): CookieOptions {
  return { ...options, httpOnly: true, sameSite: "lax", secure: production, path: "/" };
}
