// From MZauron/aquatix src/platform/auth/login-code-limit.test.ts @ 4a87d68
import { describe, expect, it } from "vitest";
import { MAX_CODES_PER_HOUR, RESEND_COOLDOWN_MS, decideLoginCode } from "./login-code-limit";

const NOW = 1_000_000_000_000;
const minutesAgo = (m: number) => NOW - m * 60_000;

describe("decideLoginCode", () => {
  it("allows the first code", () => {
    expect(decideLoginCode([], NOW)).toEqual({ ok: true });
  });

  it("blocks a resend inside the 60 s cooldown and says how long to wait", () => {
    expect(decideLoginCode([NOW - 45_000], NOW)).toEqual({ ok: false, code: "RESEND_TOO_SOON", retryAfterSeconds: 15 });
  });

  it("allows a resend exactly at the cooldown", () => {
    expect(decideLoginCode([NOW - RESEND_COOLDOWN_MS], NOW)).toEqual({ ok: true });
  });

  it("allows the 5th code but blocks the 6th within the hour", () => {
    expect(decideLoginCode([50, 40, 30, 20].map(minutesAgo), NOW)).toEqual({ ok: true });
    expect(decideLoginCode([50, 40, 30, 20, 10].map(minutesAgo), NOW)).toEqual({
      ok: false,
      code: "TOO_MANY_CODES",
      retryAfterSeconds: 10 * 60,
    });
  });

  it("frees the window when the oldest counted code leaves the hour", () => {
    expect(decideLoginCode([61, 40, 30, 20, 10].map(minutesAgo), NOW)).toEqual({ ok: true });
  });

  it("reports the cooldown first when both limits apply", () => {
    const sentAt = [50, 40, 30, 20].map(minutesAgo).concat(NOW - 5_000);
    expect(sentAt).toHaveLength(MAX_CODES_PER_HOUR);
    expect(decideLoginCode(sentAt, NOW)).toMatchObject({ code: "RESEND_TOO_SOON" });
  });

  it("ignores input order", () => {
    expect(decideLoginCode([10, 50, 20, 40, 30].map(minutesAgo), NOW)).toMatchObject({ code: "TOO_MANY_CODES" });
  });
});
