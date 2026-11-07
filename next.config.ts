import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "";
const isDevelopment = process.env.NODE_ENV === "development";

// Next.js injects inline scripts for hydration and the theme is set before paint, so scripts
// allow 'unsafe-inline'. The policy still blocks framing, plugins, other script hosts and form
// posts to other sites. Razorpay checkout needs its script, frame and API hosts.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://*.razorpay.com",
  [
    "connect-src 'self'",
    supabaseHost && `https://${supabaseHost} wss://${supabaseHost}`,
    "https://*.razorpay.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Sentry loads its Node hooks at runtime, which breaks if the bundler inlines them.
  serverExternalPackages: ["@sentry/nextjs", "pdfkit"],
  // pdfkit reads its font metrics from disk at runtime, which file tracing cannot see.
  outputFileTracingIncludes: { "/api/v1/**": ["./node_modules/pdfkit/js/data/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
