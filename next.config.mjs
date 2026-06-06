/** @type {import('next').NextConfig} */

// Content-Security-Policy for resey.uk.
// First-pass policy: intentionally safe but not too strict so the live store,
// Supabase (data + storage images), and Vercel analytics keep working.
// TODO(security): tighten this later — remove 'unsafe-inline' and 'unsafe-eval'
// from script-src once we verify the app works with nonces/hashes in preview.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.vercel-insights.com https://vitals.vercel-insights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "**",
      },
      {
        hostname: "fakestoreapi.com",
      },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: process.env.NODE_ENV === "development",
},
  async headers() {
    return [
      {
        // Apply security headers to all routes.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
