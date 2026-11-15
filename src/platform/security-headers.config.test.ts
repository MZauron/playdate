// From MZauron/aquatix src/platform/security-headers.config.test.ts @ 4a87d68
import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";

afterEach(() => vi.unstubAllEnvs());

describe("next.config: the security headers are connected", () => {
  it("sets them on every path, and does not say which framework serves the app", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    expect(rules[0]!.source).toBe("/:path*");
    const keys = rules[0]!.headers.map((h) => h.key);
    for (const key of ["X-Frame-Options", "Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) expect(keys).toContain(key);
  });

  it("adds HSTS in production only (a browser that saw it on localhost would refuse plain http there for a year)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await nextConfig.headers!())[0]!.headers.map((h) => h.key)).not.toContain("Strict-Transport-Security");
    vi.stubEnv("NODE_ENV", "production");
    expect((await nextConfig.headers!())[0]!.headers.map((h) => h.key)).toContain("Strict-Transport-Security");
  });

  it("the invite page sends no referrer and asks not to be indexed (its URL is the friend's link)", async () => {
    const invite = (await nextConfig.headers!()).find((r) => r.source === "/r/:token*");
    expect(invite?.headers).toEqual([
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ]);
  });
});
