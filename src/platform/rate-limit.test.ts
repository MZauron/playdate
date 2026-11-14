// From MZauron/aquatix src/platform/rate-limit.test.ts @ 4a87d68
import { describe, expect, it } from "vitest";
import { clientAddress, createRateLimiter } from "./rate-limit";

describe("the rate limit", () => {
  it("lets a key through up to the limit, then refuses it and says when to come back", () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000, now: () => t });
    for (let i = 0; i < 3; i++) expect(limiter.hit("a")).toEqual({ ok: true });
    t = 10_000;
    expect(limiter.hit("a")).toEqual({ ok: false, retryAfterSeconds: 50 });
    expect(limiter.hit("a")).toEqual({ ok: false, retryAfterSeconds: 50 }); // a refused try does not push the window
  });

  it("counts each key by itself", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.hit("a").ok).toBe(true);
    expect(limiter.hit("b").ok).toBe(true);
    expect(limiter.hit("a").ok).toBe(false);
  });

  it("lets the key through again once its tries have left the window", () => {
    let t = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000, now: () => t });
    limiter.hit("a");
    t = 30_000;
    limiter.hit("a");
    t = 59_999;
    expect(limiter.hit("a").ok).toBe(false);
    t = 60_000; // the first try is a full window old
    expect(limiter.hit("a").ok).toBe(true);
    expect(limiter.hit("a").ok).toBe(false);
  });

  it("never keeps more keys than it was told to: the oldest are forgotten", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000, now: () => 0, maxKeys: 2 });
    limiter.hit("a");
    limiter.hit("b");
    limiter.hit("c"); // "a" is dropped
    expect(limiter.hit("b").ok).toBe(false);
    expect(limiter.hit("c").ok).toBe(false);
    expect(limiter.hit("a").ok).toBe(true); // forgotten, so through again: the limit only ever errs towards letting someone in
  });
});

describe("the visitor's address", () => {
  const headers = (h: Record<string, string>) => ({ get: (name: string) => h[name] ?? null });
  it("is the first entry the proxy reports, then the real-ip header, then one shared bucket", () => {
    expect(clientAddress(headers({ "x-forwarded-for": "190.12.3.4, 10.0.0.1" }))).toBe("190.12.3.4");
    expect(clientAddress(headers({ "x-real-ip": " 190.12.3.5 " }))).toBe("190.12.3.5");
    expect(clientAddress(headers({}))).toBe("unknown");
    expect(clientAddress(headers({ "x-forwarded-for": " " }))).toBe("unknown");
  });
});
