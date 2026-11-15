import type { NextConfig } from "next";
import { securityHeaders } from "./src/platform/security-headers";

const nextConfig: NextConfig = {
  // Stop `next dev` from rewriting CLAUDE.md; project rules are maintained by hand.
  agentRules: false,
  // Do not say which framework serves the app.
  poweredByHeader: false,
  reactStrictMode: true,
  // Every response carries the security headers (no framing by other sites, no MIME sniffing, HTTPS only in production).
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "production") },
      // The invite page: its URL holds the friend's link token, so no page it links to learns the URL, and no search engine lists it.
      { source: "/r/:token*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
