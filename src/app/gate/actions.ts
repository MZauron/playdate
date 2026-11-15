"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { secureSite } from "@/lib/auth/session-cookie-options";
import { GATE_COOKIE, GATE_DAYS, gateToken, passwordMatches, safeNext } from "@/lib/gate/gate";
import { enCA } from "@/lib/i18n/en-CA";
import { clientAddress, createRateLimiter } from "@/platform/rate-limit";

/** 10 tries per address per 15 minutes: the password is short and shared. */
const gateLimiter = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

export type GateState = { error?: string };

export async function openGateAction(_previous: GateState, form: FormData): Promise<GateState> {
  const next = safeNext(String(form.get("next") ?? ""));
  const password = env.SITE_PASSWORD;
  if (!password) redirect(next);
  if (!gateLimiter.hit(clientAddress(await headers())).ok) return { error: enCA.gate.tooMany };
  if (!passwordMatches(password, String(form.get("password") ?? ""))) return { error: enCA.gate.wrong };
  (await cookies()).set(GATE_COOKIE, gateToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureSite(env.PUBLIC_LINK_BASE),
    path: "/",
    maxAge: GATE_DAYS * 24 * 60 * 60,
  });
  redirect(next);
}
