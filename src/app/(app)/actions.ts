"use server";

import { redirect } from "next/navigation";
import { sessionClient } from "@/lib/auth/supabase-server";

/** Sign out: ends this device's session (the session cookies are cleared) and goes back to sign-in. */
export async function signOutAction(): Promise<void> {
  await (await sessionClient()).auth.signOut({ scope: "local" });
  redirect("/sign-in");
}
