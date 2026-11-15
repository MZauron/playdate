"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { requireParent } from "@/lib/auth/require-parent";
import { playdateStore } from "@/lib/db/playdates";
import { parsePlanForm, playdatesLimiter, sendInvite, type PlanError, type TextToSend } from "@/lib/domain/playdates";
import { enCA } from "@/lib/i18n/en-CA";

/** Field → the message shown under it ("form" for the rest). `sent` holds the Text buttons: the links exist only here (KD-14). */
export type SendInviteState = { errors: Record<string, string>; sent?: { playdateId: string; texts: TextToSend[]; update?: boolean } };

function errorMessages(errors: readonly PlanError[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of errors) {
    const field = e.field === "start" || e.field === "end" ? "time" : (e.field ?? "form");
    out[field] ??= enCA.plan.errors[e.code as keyof typeof enCA.plan.errors] ?? enCA.somethingWentWrong;
  }
  return out;
}

export async function sendInviteAction(_previous: SendInviteState, form: FormData): Promise<SendInviteState> {
  const { user, profile } = await requireParent(); // the organizer is the signed-in parent, whatever the form says
  const result = await sendInvite(
    { store: playdateStore, limiter: playdatesLimiter, linkBase: env.PUBLIC_LINK_BASE },
    { id: user.id, firstName: profile.firstName, childFirstName: profile.children[0]?.firstName ?? "" }, // Q4 default: the first child
    parsePlanForm(form),
    new Date(),
  );
  if (!result.ok) return { errors: errorMessages(result.errors) };
  console.info(`playdate created id=${result.playdateId} invites=${result.texts.length}`);
  revalidatePath("/");
  return { errors: {}, sent: { playdateId: result.playdateId, texts: result.texts } };
}
