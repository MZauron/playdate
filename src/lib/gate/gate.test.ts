import { describe, expect, it } from "vitest";
import { gateOpen, gateToken, passwordMatches, safeNext } from "./gate";

describe("the staging curtain", () => {
  it("is open when no SITE_PASSWORD is set", () => {
    expect(gateOpen(undefined, undefined)).toBe(true);
    expect(gateOpen("", undefined)).toBe(true);
  });
  it("opens only with the cookie made from the right password, which never holds the password", () => {
    expect(gateOpen("tulips-42", undefined)).toBe(false);
    expect(gateOpen("tulips-42", gateToken("other"))).toBe(false);
    expect(gateOpen("tulips-42", "tulips-42")).toBe(false);
    expect(gateOpen("tulips-42", gateToken("tulips-42"))).toBe(true);
    expect(gateToken("tulips-42")).not.toContain("tulips");
  });
  it("checks a password attempt", () => {
    expect(passwordMatches("tulips-42", "tulips-42")).toBe(true);
    expect(passwordMatches("tulips-42", "tulips-43")).toBe(false);
    expect(passwordMatches("tulips-42", "")).toBe(false);
  });
  it("sends the visitor back only to a path on this site", () => {
    expect(safeNext("/plan")).toBe("/plan");
    expect(["//evil.test", "https://evil.test", "/\\evil.test", "", null, undefined].map(safeNext)).toEqual(["/", "/", "/", "/", "/", "/"]);
  });
});
