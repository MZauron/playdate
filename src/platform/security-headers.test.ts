// From MZauron/aquatix src/platform/security-headers.test.ts @ 4a87d68
import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

const byKey = (production: boolean) => Object.fromEntries(securityHeaders(production).map((h) => [h.key, h.value]));

describe("securityHeaders", () => {
  it("refuses every frame, sniffing and full referrers, and the camera, microphone and location", () => {
    const headers = byKey(false);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'none'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("asks for https only in production", () => {
    expect(byKey(false)["Strict-Transport-Security"]).toBeUndefined();
    expect(byKey(true)["Strict-Transport-Security"]).toBe("max-age=31536000");
  });
});
