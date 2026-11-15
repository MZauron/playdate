import { describe, expect, it } from "vitest";
import { cronAuthorized } from "./cron-auth";

describe("cronAuthorized", () => {
  const secret = "s".repeat(32);
  it("accepts exactly Bearer <secret>", () => expect(cronAuthorized(`Bearer ${secret}`, secret)).toBe(true));
  it("refuses anything else, and everything when no secret is set", () => {
    expect(cronAuthorized(null, secret)).toBe(false);
    expect(cronAuthorized(secret, secret)).toBe(false);
    expect(cronAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(cronAuthorized("Bearer ", undefined)).toBe(false);
  });
});
