"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/lib/auth/require-parent";
import { getCurrentUser, sessionClient } from "@/lib/auth/supabase-server";
import { playdatePageStore } from "@/lib/db/playdate-page";
import { cancelPlaydate, confirmPlaydate, isPlaydateId } from "@/lib/domain/playdate-page";
import { enCA } from "@/lib/i18n/en-CA";

export type ConfirmState = { error?: string };

/** KD-01/KD-09: the organizer's tap is the only thing that confirms. Whose playdate this is comes from the session. */
export async function confirmAction(_previous: ConfirmState, form: FormData): Promise<ConfirmState> {
  const { user } = await requireParent();
  const playdateId = String(form.get("playdateId") ?? "");
  // Availability (T14): the suggested time the organizer tapped, as instants. Anything malformed counts as none (CONFIRM_NEEDS_TIME).
  const instant = (name: string) => {
    const d = new Date(String(form.get(name) ?? ""));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const start = instant("chosenStart");
  const end = instant("chosenEnd");
  const result = await confirmPlaydate(playdatePageStore, user.id, playdateId, new Date(), start && end ? { start, end } : null);
  if (isPlaydateId(playdateId)) revalidatePath(`/playdates/${playdateId}`);
  revalidatePath("/");
  if (!result.ok) return { error: enCA.playdate.errors[result.code as keyof typeof enCA.playdate.errors] ?? enCA.somethingWentWrong };
  console.info(`playdate confirmed id=${playdateId}`);
  return {};
}

/** KD-15: Cancel playdate, organizer only, after the page asked "Cancel this playdate?". */
export async function cancelAction(_previous: ConfirmState, form: FormData): Promise<ConfirmState> {
  const { user } = await requireParent();
  const playdateId = String(form.get("playdateId") ?? "");
  const result = await cancelPlaydate(playdatePageStore, user.id, playdateId, new Date());
  if (isPlaydateId(playdateId)) revalidatePath(`/playdates/${playdateId}`);
  revalidatePath("/");
  if (!result.ok) return { error: enCA.playdate.errors.NOT_FOUND };
  console.info(`playdate cancelled id=${playdateId}`);
  return {};
}

/**
 * The signed-in parent's access token, for the browser's Realtime connection only (DESIGN.md "Live answers"). Session cookies stay
 * httpOnly; Row Level Security then limits what Realtime delivers to this parent's own playdates, invites and answers.
 */
export async function realtimeTokenAction(): Promise<string | null> {
  const user = await getCurrentUser(); // verified with the identity service first
  if (!user) return null;
  const { data } = await (await sessionClient()).auth.getSession();
  return data.session?.access_token ?? null;
}
