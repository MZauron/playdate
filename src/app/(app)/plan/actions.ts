"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { listTypedPlaces, playdateStore } from "@/lib/db/playdates";
import { parsePlanForm, playdatesLimiter, sendInvite, type PlanError, type TextToSend } from "@/lib/domain/playdates";
import { SayRequest, sayIt, sayLimiter } from "@/lib/domain/say-it";
import { enCA } from "@/lib/i18n/en-CA";
import { sayItIdeas } from "@/lib/integrations/ai";
import { places } from "@/lib/integrations/places";
import { DEFAULT_ZONE } from "@/lib/rules/config";
import { forgetSaid, rememberSaid } from "./said-cookie";

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
    { store: playdateStore, places: places(), limiter: playdatesLimiter, linkBase: env.PUBLIC_LINK_BASE },
    { id: user.id, firstName: profile.firstName, childFirstName: profile.children[0]?.firstName ?? "", children: profile.children }, // T41: who it is for
    parsePlanForm(form),
    new Date(),
  );
  if (!result.ok) return { errors: errorMessages(result.errors) };
  await forgetSaid(); // T43: what Or just say it filled in is used up
  console.info(`playdate created id=${result.playdateId} invites=${result.texts.length}`);
  revalidatePath("/");
  return { errors: {}, sent: { playdateId: result.playdateId, texts: result.texts } };
}

export type SayItState = { error?: string };

/** "2026-11-18" on the parent's own clock: the zone their browser sent when it is a real one, else the default. */
function todayIn(zone: unknown): string {
  const format = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  try {
    return typeof zone === "string" && zone.length > 0 && zone.length <= 64 ? format(zone) : format(DEFAULT_ZONE);
  } catch {
    return format(DEFAULT_ZONE);
  }
}

/**
 * T43, Or just say it on Home: the sentence → Plan, filled in. Nothing is sent and nothing is saved but a ten-minute cookie; only the
 * parent's own friends and saved places are used. Logs a code, never the words.
 */
export async function sayItAction(_previous: SayItState, form: FormData): Promise<SayItState> {
  const { user } = await requireParent();
  const input = SayRequest.safeParse({ words: form.get("words") ?? "" });
  if (!input.success) return { error: enCA.home.sayIt.nothing };
  const [friends, savedPlaces] = await Promise.all([listFriends(user.id), listTypedPlaces(user.id)]);
  const result = await sayIt(
    { ai: sayItIdeas(), limiter: sayLimiter, log: (code) => console.warn(`say_it ${code}`) },
    { id: user.id, friends, savedPlaces },
    input.data.words,
    todayIn(form.get("zone")),
  );
  if (!result.ok) return { error: enCA.home.sayIt.nothing };
  console.info(`say_it filled source=${result.source}`);
  await rememberSaid(user.id, result.prefill);
  redirect("/plan?said=1");
}
