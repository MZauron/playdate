// Runs before every page and server action (not the API routes, Next's own files or anything with a file extension: see `config`).
// Session renewal: Server Components cannot write cookies, so a session that is about to run out is renewed HERE, and the page that
// follows sees the new cookies as if the parent had just signed in. Who may see which page is decided by the guards in src/lib/auth.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { secureSite, sessionCookieOptions } from "@/lib/auth/session-cookie-options";
import { GATE_COOKIE, gateOpen } from "@/lib/gate/gate";

export async function proxy(request: NextRequest) {
  // Staging curtain (SITE_PASSWORD): every page and action waits behind /gate until the password was given. The invite page and
  // the API routes are outside this matcher, so friends' links and the health check always work. The privacy page (T24) is
  // linked from the invite page, so it skips the curtain too.
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/gate" && pathname !== "/privacy" && !gateOpen(env.SITE_PASSWORD, request.cookies.get(GATE_COOKIE)?.value)) {
    const gate = new URL("/gate", request.url);
    gate.searchParams.set("next", pathname + search);
    return NextResponse.redirect(gate);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, sessionCookieOptions(options, secureSite(env.PUBLIC_LINK_BASE)));
      },
    },
  });
  // Validates the session with the identity service and renews it when needed.
  await supabase.auth.getUser();
  return response;
}

// Pages and server actions, not the API routes, the invite page (no account there), Next's files or anything with a file extension.
export const config = { matcher: ["/((?!api/|r/|_next/|.*\\..*).*)"] };
