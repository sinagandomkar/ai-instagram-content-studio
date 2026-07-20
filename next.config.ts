import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean Docker image (docs/DEPLOYMENT.md) — bundles only what's needed to run, not the full node_modules tree.
  output: "standalone",
  // Dev server blocks cross-origin requests by default (security). Needed while
  // exposing localhost through a tunnel — wildcards cover the random subdomain
  // each tool generates on every restart. lhr.life is localhost.run (SSH tunnel,
  // no signup — switched to this after cloudflared's QUIC/HTTP2 kept dropping on
  // this network); trycloudflare.com kept for whichever tunnel ends up running.
  allowedDevOrigins: ["*.trycloudflare.com", "*.lhr.life"],
};

export default nextConfig;
