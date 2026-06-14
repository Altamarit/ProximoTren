import type { NextConfig } from "next";

// ── Security Headers (NFR-005, NFR-008, NFR-009) ─────────────────────────────
// Applied to ALL responses. Per-route overrides (Cache-Control) are set
// directly in the Route Handlers (E7-S3).
//
// CSP invariant: connect-src 'self' ensures the browser can only contact the
// same origin BFF — preventing any client-side call to CRTM that would expose
// CRTM_API_KEY to the browser.

const isDev = process.env.NODE_ENV === "development";

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' required for Next.js App Router hydration bootstrap scripts.
      // 'unsafe-eval' required only in development for React Refresh / hot reload.
      // Nonce-based approach (next.config + middleware) would be more restrictive
      // but requires per-request nonce injection — tracked as follow-up (E7-S4).
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      // 'unsafe-inline' required for Next.js styled-jsx / CSS-in-JS inline styles.
      // api.fontshare.com required for Satoshi typeface (design system).
      "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
      "img-src 'self' data:",
      "font-src 'self' https://api.fontshare.com https://cdn.fontshare.com",
      // CRITICAL INVARIANT: 'self' only — browser cannot call CRTM directly.
      // This architecturally enforces the BFF pattern and protects CRTM_API_KEY.
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Complements HSTS for client-side mixed-content upgrade
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // X-XSS-Protection intentionally omitted: deprecated in Chrome 78+, removed from
  // Firefox, and the 'mode=block' variant has a known IE8/IE9 content-leak exploit.
  // CSP script-src handles XSS for all supported browsers.
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  env: {
    // Expose transport adapter mode to server-side code
    TRANSPORT_ADAPTER: process.env.TRANSPORT_ADAPTER ?? "mock",
  },
  serverExternalPackages: [],
};

export default nextConfig;
