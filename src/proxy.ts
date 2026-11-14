// Runs before every page and server action (not the API routes, Next's own files or anything with a file extension: see `config`).
// Session renewal: Server Components cannot write cookies, so a session that is about to run out is renewed HERE, and the page that
// follows sees the new cookies as if the parent had just signed in. Who may see which page is decided by the guards in src/lib/auth.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { sessionCookieOptions } from "@/lib/auth/session-cookie-options";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, sessionCookieOptions(options, env.NODE_ENV === "production"));
      },
    },
  });
  // Validates the session with the identity service and renews it when needed.
  await supabase.auth.getUser();
  return response;
}

// Pages and server actions, not the API routes, the invite page (no account there), Next's files or anything with a file extension.
export const config = { matcher: ["/((?!api/|r/|_next/|.*\\..*).*)"] };
