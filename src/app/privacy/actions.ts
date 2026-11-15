"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-parent";
import { sessionClient } from "@/lib/auth/supabase-server";
import { deleteAccount } from "@/lib/db/accounts";
import { enCA } from "@/lib/i18n/en-CA";

export type DeleteAccountState = { error?: string };

/** Delete my account (T24): the signed-in parent's own account, whatever the form says; then this device is signed out. */
export async function deleteAccountAction(): Promise<DeleteAccountState> {
  const user = await requireUser();
  if (!(await deleteAccount(user.id))) {
    console.error(`account_delete_failed id=${user.id}`);
    return { error: enCA.privacy.deleteFailed };
  }
  console.info(`account deleted id=${user.id}`);
  await (await sessionClient()).auth.signOut({ scope: "local" }); // the session is already void; this clears its cookies
  redirect("/sign-in?deleted=1");
}
