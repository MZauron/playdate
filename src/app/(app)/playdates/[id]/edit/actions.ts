"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { requireParent } from "@/lib/auth/require-parent";
import { playdatePageStore } from "@/lib/db/playdate-page";
import { applyPlaydateUpdate, playdateStore } from "@/lib/db/playdates";
import { isPlaydateId } from "@/lib/domain/playdate-page";
import { sendUpdate, updatesLimiter } from "@/lib/domain/edit-playdate";
import { parsePlanForm } from "@/lib/domain/playdates";
import type { SendInviteState } from "@/app/(app)/plan/actions";
import { enCA } from "@/lib/i18n/en-CA";

/** Send update (T16). Whose playdate this is comes from the session; the form's playdate id only names it. */
export async function sendUpdateAction(_previous: SendInviteState, form: FormData): Promise<SendInviteState> {
  const { user, profile } = await requireParent();
  const playdateId = String(form.get("playdateId") ?? "");
  const result = await sendUpdate(
    { pages: playdatePageStore, playdates: playdateStore, apply: applyPlaydateUpdate, limiter: updatesLimiter, linkBase: env.PUBLIC_LINK_BASE },
    { id: user.id, firstName: profile.firstName, childFirstName: profile.children[0]?.firstName ?? "" }, // Q4 default: the first child
    playdateId,
    parsePlanForm(form),
    new Date(),
  );
  if (!result.ok) {
    const out: Record<string, string> = {};
    for (const e of result.errors) {
      const field = "field" in e && e.field ? (e.field === "start" || e.field === "end" ? "time" : e.field) : "form";
      out[field] ??= enCA.plan.errors[e.code as keyof typeof enCA.plan.errors] ?? enCA.somethingWentWrong;
    }
    return { errors: out };
  }
  if (isPlaydateId(playdateId)) revalidatePath(`/playdates/${playdateId}`);
  revalidatePath("/");
  if (!result.changed) return { errors: { form: enCA.plan.nothingChanged } };
  console.info(`playdate updated id=${playdateId} kind=${result.kind} texts=${result.texts.length}`);
  return { errors: {}, sent: { playdateId, texts: result.texts, update: true } };
}
