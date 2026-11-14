"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCodeLog } from "@/lib/auth/code-log";
import { sessionClient } from "@/lib/auth/supabase-server";
import { getParentProfile } from "@/lib/db/profiles";
import { addressLimiter, attemptLimiter, checkCode, requestCode, type SignInFailure } from "@/lib/domain/sign-in";
import { enCA } from "@/lib/i18n/en-CA";
import { maskPhoneForLog } from "@/lib/phone";
import { clientAddress } from "@/platform/rate-limit";

export type SignInState =
  | { step: "phone"; error?: string; phoneInput?: string }
  | { step: "code"; phone: string; sentAt: number; error?: string };

const codeLog = createCodeLog();

/** A failed try keeps the time the last code was sent, so the resend countdown does not start over. */
const sentAtOf = (state: SignInState) => (state.step === "code" ? state.sentAt : 0);

function message(failure: SignInFailure): string {
  const errors = enCA.signIn.errors;
  if (failure.code === "RESEND_TOO_SOON") return errors.RESEND_TOO_SOON(failure.retryAfterSeconds ?? 60);
  return errors[failure.code];
}

/** One action for both steps; `intent` says which: send, resend, verify or restart. Nothing the form says is trusted beyond the phone and code typed. */
export async function signInAction(previous: SignInState, form: FormData): Promise<SignInState> {
  const intent = String(form.get("intent") ?? "");
  const supabase = await sessionClient();

  if (intent === "restart") return { step: "phone" };

  if (intent === "send" || intent === "resend") {
    const phone = String(form.get(intent === "send" ? "phone" : "phoneE164") ?? "");
    const result = await requestCode(
      {
        sendCode: async (e164) => {
          const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
          if (error) console.error(`[sign-in] SEND_FAILED phone=${maskPhoneForLog(e164)} status=${error.status ?? "?"}`);
          return !error;
        },
        codeLog,
        addressLimiter,
        nowMs: Date.now(),
      },
      { phone, address: clientAddress(await headers()) },
    );
    if (result.ok) return { step: "code", phone: result.phone, sentAt: Date.now() };
    if (intent === "resend") return { step: "code", phone, sentAt: sentAtOf(previous), error: message(result) };
    return { step: "phone", phoneInput: phone, error: message(result) };
  }

  if (intent === "verify") {
    const phone = String(form.get("phoneE164") ?? "");
    let userId: string | null = null;
    const result = await checkCode(
      {
        verifyCode: async (e164, code) => {
          const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: code, type: "sms" });
          userId = data.user?.id ?? null;
          return !error && userId !== null;
        },
        attemptLimiter,
      },
      { phone, code: String(form.get("code") ?? "") },
    );
    if (!result.ok) return { step: "code", phone, sentAt: sentAtOf(previous), error: message(result) };
    redirect((await getParentProfile(userId!)) ? "/" : "/setup");
  }

  return { step: "phone", error: enCA.somethingWentWrong };
}
