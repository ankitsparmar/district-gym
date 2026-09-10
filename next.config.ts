import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api/setup/bootstrap route reads SQL migration files from ./drizzle
  // at runtime (not via import), so they need to be explicitly traced into
  // the deployed function bundle.
  outputFileTracingIncludes: {
    "/api/setup/bootstrap": ["./drizzle/**"],
  },
};

export default nextConfig;
