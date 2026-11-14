import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "./session-cookie-options";

describe("sessionCookieOptions", () => {
  it("never lets scripts read the session, and keeps it to this site", () => {
    const options = sessionCookieOptions({ httpOnly: false, sameSite: "none", maxAge: 400 }, false);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 400 });
  });
  it("is Secure in production only (Safari refuses Secure cookies on plain-http localhost)", () => {
    expect(sessionCookieOptions({}, true).secure).toBe(true);
    expect(sessionCookieOptions({}, false).secure).toBe(false);
  });
});
