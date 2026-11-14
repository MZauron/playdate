// From MZauron/aquatix src/platform/auth/login-code-limit.ts @ 4a87d68
// Per-phone limits for login codes. Supabase only enforces a 60 s resend per user and a
// project-wide hourly SMS cap, so the "5 codes per hour per phone" rule is ours.
export const RESEND_COOLDOWN_MS = 60_000;
export const MAX_CODES_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

export type LoginCodeDecision =
  | { ok: true }
  | { ok: false; code: "RESEND_TOO_SOON" | "TOO_MANY_CODES"; retryAfterSeconds: number };

/** `sentAt` = timestamps (ms) of earlier codes sent to this phone; order does not matter. */
export function decideLoginCode(sentAt: readonly number[], nowMs: number): LoginCodeDecision {
  const lastHour = sentAt.filter((t) => nowMs - t < HOUR_MS).sort((a, b) => a - b);
  const newest = lastHour.at(-1);
  if (newest !== undefined && nowMs - newest < RESEND_COOLDOWN_MS) {
    return { ok: false, code: "RESEND_TOO_SOON", retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - (nowMs - newest)) / 1000) };
  }
  if (lastHour.length >= MAX_CODES_PER_HOUR) {
    // The window frees up when the oldest code of the last five leaves the hour.
    const oldestCounted = lastHour[lastHour.length - MAX_CODES_PER_HOUR]!;
    return { ok: false, code: "TOO_MANY_CODES", retryAfterSeconds: Math.ceil((oldestCounted + HOUR_MS - nowMs) / 1000) };
  }
  return { ok: true };
}
