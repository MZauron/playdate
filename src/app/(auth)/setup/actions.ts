"use server";

import { redirect } from "next/navigation";
import { env } from "@/env";
import { requireUser } from "@/lib/auth/require-parent";
import { setupStore } from "@/lib/db/profiles";
import { completeSetup, parseSetupForm } from "@/lib/domain/setup";
import { enCA } from "@/lib/i18n/en-CA";

/** Field name -> the short message under it. */
export type SetupState = { errors: Record<string, string> };

export async function setupAction(_previous: SetupState, form: FormData): Promise<SetupState> {
  const user = await requireUser(); // the parent is the signed-in user, whatever the form says
  const result = await completeSetup({ store: setupStore, phoneHashKey: env.PHONE_HASH_KEY }, user, parseSetupForm(form));
  if (!result.ok) {
    const errors: Record<string, string> = {};
    for (const e of result.errors) errors[e.field] ??= enCA.setup.errors[e.code];
    return { errors };
  }
  redirect(result.created ? "/?welcome=1" : "/");
}
