import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers configured in E1-S4
  env: {
    // Expose transport adapter mode to server-side code
    TRANSPORT_ADAPTER: process.env.TRANSPORT_ADAPTER ?? "mock",
  },
  serverExternalPackages: [],
};

export default nextConfig;
