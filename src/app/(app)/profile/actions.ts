"use server";

import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth/require-parent";
import { profileStore } from "@/lib/db/profiles";
import { parseProfileForm, saveProfile } from "@/lib/domain/profile";
import { enCA } from "@/lib/i18n/en-CA";

/** Field name -> the short message under it (Setup's messages). */
export type ProfileState = { errors: Record<string, string> };

/** T39: saves the signed-in parent's first name and children; nothing in the form says who the parent is. */
export async function saveProfileAction(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const { user } = await requireParent();
  const result = await saveProfile(profileStore, user.id, parseProfileForm(form));
  if (!result.ok) {
    const errors: Record<string, string> = {};
    for (const e of result.errors) errors[e.field] ??= enCA.setup.errors[e.code];
    return { errors };
  }
  redirect("/profile?saved=1");
}
