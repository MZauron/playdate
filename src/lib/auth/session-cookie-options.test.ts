import { describe, expect, it } from "vitest";
import { secureSite, sessionCookieOptions } from "./session-cookie-options";

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

describe("secureSite", () => {
  it("is true for an https site (staging, production) and false for plain http (a local build)", () => {
    expect(secureSite("https://kindred.app")).toBe(true);
    expect(secureSite("http://localhost:3100")).toBe(false);
    expect(secureSite("http://192.168.1.146:3200")).toBe(false);
  });
});
