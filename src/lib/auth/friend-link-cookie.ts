// T34: a friend link opened by someone not signed in yet. The token waits in an httpOnly cookie for an hour while they sign in and
// finish Setup; Home then sends them back to the link's page to say yes. Server only.
import "server-only";
import { cookies } from "next/headers";
import { env } from "@/env";
import { secureSite } from "./session-cookie-options";

const COOKIE = "kd_friend_link";

export async function rememberFriendLink(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureSite(env.PUBLIC_LINK_BASE), path: "/", maxAge: 60 * 60 });
}

export async function pendingFriendLink(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only from a server action or route handler (pages can't change cookies). */
export async function forgetFriendLink(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
