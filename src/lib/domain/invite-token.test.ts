import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashToken, inviteLink, newInviteToken } from "./invite-token";

describe("invite tokens (KD-14)", () => {
  it("are 128 random bits as 22 characters of base64url, different every time", () => {
    const tokens = Array.from({ length: 50 }, () => newInviteToken().token);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(new Set(tokens).size).toBe(50);
    expect(Buffer.from(tokens[0]!, "base64url")).toHaveLength(16);
  });
  it("are stored as their hex sha256 only", () => {
    const { token, tokenHash } = newInviteToken(() => Buffer.alloc(16, 7));
    expect(token).toBe(Buffer.alloc(16, 7).toString("base64url"));
    expect(tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(tokenHash).toBe(hashToken(token));
    expect(tokenHash).not.toContain(token);
  });
  it("make one link per invite on the invite page", () => {
    expect(inviteLink("https://kindred.test", "abc")).toBe("https://kindred.test/r/abc");
  });
});
