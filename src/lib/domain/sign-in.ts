// The two steps of sign-in (T05): ask for a code, then check it. Pure apart from the ports passed in, so it is tested without Supabase.
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { parseCode } from "@/lib/auth/code-input";
import type { CodeLog } from "@/lib/auth/code-log";
import { decideLoginCode } from "@/lib/auth/login-code-limit";
import { parsePhone } from "@/lib/phone";

export type SignInErrorCode = "INVALID_PHONE" | "INVALID_CODE" | "RESEND_TOO_SOON" | "TOO_MANY_CODES" | "TOO_MANY_REQUESTS" | "SEND_FAILED" | "CODE_REJECTED";
export type SignInFailure = { ok: false; code: SignInErrorCode; retryAfterSeconds?: number };

export type SendCodeDeps = {
  /** Asks the identity service to text a code to this E.164 number. */
  sendCode(phoneE164: string): Promise<boolean>;
  codeLog: CodeLog;
  /** Tries per visitor address. */
  addressLimiter: RateLimiter;
  nowMs: number;
};

export async function requestCode(deps: SendCodeDeps, input: { phone: string; address: string }): Promise<{ ok: true; phone: string } | SignInFailure> {
  const phone = parsePhone(input.phone);
  if (!phone) return { ok: false, code: "INVALID_PHONE" };

  const address = deps.addressLimiter.hit(input.address);
  if (!address.ok) return { ok: false, code: "TOO_MANY_REQUESTS", retryAfterSeconds: address.retryAfterSeconds };

  const decision = decideLoginCode(deps.codeLog.sentAt(phone, deps.nowMs), deps.nowMs);
  if (!decision.ok) return { ok: false, code: decision.code, retryAfterSeconds: decision.retryAfterSeconds };

  if (!(await deps.sendCode(phone))) return { ok: false, code: "SEND_FAILED" };
  deps.codeLog.record(phone, deps.nowMs);
  return { ok: true, phone };
}

export type VerifyDeps = {
  /** Checks the code with the identity service; true when it signed the parent in (the session cookies are set by the caller's client). */
  verifyCode(phoneE164: string, code: string): Promise<boolean>;
  /** Tries per phone, so a six-digit code cannot be guessed. */
  attemptLimiter: RateLimiter;
};

export async function checkCode(deps: VerifyDeps, input: { phone: string; code: string }): Promise<{ ok: true } | SignInFailure> {
  const phone = parsePhone(input.phone);
  const code = parseCode(input.code);
  if (!phone) return { ok: false, code: "INVALID_PHONE" };
  if (!code) return { ok: false, code: "INVALID_CODE" };

  const attempt = deps.attemptLimiter.hit(phone);
  if (!attempt.ok) return { ok: false, code: "TOO_MANY_REQUESTS", retryAfterSeconds: attempt.retryAfterSeconds };

  return (await deps.verifyCode(phone, code)) ? { ok: true } : { ok: false, code: "CODE_REJECTED" };
}

/** In-process limiters for the real actions: 20 codes per address per hour; 8 code tries per phone per 15 minutes. */
export const addressLimiter = createRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 });
export const attemptLimiter = createRateLimiter({ max: 8, windowMs: 15 * 60 * 1000 });
