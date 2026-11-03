import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Sentry loads its Node hooks at runtime, which breaks if the bundler inlines them.
  serverExternalPackages: ["@sentry/nextjs"],
};

export default nextConfig;
