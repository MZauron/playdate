// From MZauron/aquatix src/platform/auth/sign-in-flow.ts @ 4a87d68 (the code step's input rules; the Ecuadorian phone parsing is replaced by src/lib/phone.ts)
// Input rules of the code step: pure, so they are tested without a browser or a database.
export const CODE_LENGTH = 6;

/** The code as a person types it ("123 456"), digits only; null if it is not a full code. */
export function parseCode(input: string): string | null {
  const code = input.replace(/\s/g, "");
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code) ? code : null;
}

/** A person can ask for another code this long after the last one (the limit in login-code-limit.ts enforces it too). */
export const RESEND_SECONDS = 60;

export function resendSecondsLeft(sentAtMs: number, nowMs: number): number {
  return Math.min(RESEND_SECONDS, Math.max(0, Math.ceil((sentAtMs + RESEND_SECONDS * 1000 - nowMs) / 1000)));
}
