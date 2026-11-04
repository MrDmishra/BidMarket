import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Sentry loads its Node hooks at runtime, which breaks if the bundler inlines them.
  serverExternalPackages: ["@sentry/nextjs", "pdfkit"],
  // pdfkit reads its font metrics from disk at runtime, which file tracing cannot see.
  outputFileTracingIncludes: { "/api/v1/**": ["./node_modules/pdfkit/js/data/**"] },
};

export default nextConfig;
