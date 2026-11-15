import type { NextConfig } from "next";
import { securityHeaders } from "./src/platform/security-headers";

const nextConfig: NextConfig = {
  // Stop `next dev` from rewriting CLAUDE.md; project rules are maintained by hand.
  agentRules: false,
  // Do not say which framework serves the app.
  poweredByHeader: false,
  reactStrictMode: true,
  // `next dev` serves its scripts to localhost only. To try the app from a phone on the same Wi-Fi, list the laptop's address in
  // DEV_ORIGINS (in .env.local, comma-separated, e.g. 192.168.1.146). Development only; production ignores it.
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
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
