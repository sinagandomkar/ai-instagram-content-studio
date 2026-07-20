import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean Docker image (docs/DEPLOYMENT.md) — bundles only what's needed to run, not the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
