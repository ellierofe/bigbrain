import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["falkordb", "@js-temporal/polyfill"],
};

export default nextConfig;
