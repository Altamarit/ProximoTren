import { describe, it, expect } from "vitest";
import nextConfig from "@/../next.config";

// ── Helpers ───────────────────────────────────────────────────────────────────

type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };

async function getHeadersForPath(path: string): Promise<Record<string, string>> {
  const rules: HeaderRule[] = (await nextConfig.headers?.()) ?? [];
  const result: Record<string, string> = {};

  for (const rule of rules) {
    // Convert Next.js route pattern to a rough match (glob "/(.*)" matches everything)
    const pattern = rule.source.replace("/(.*)", "/");
    if (path.startsWith(pattern) || rule.source === "/(.*)") {
      for (const h of rule.headers) {
        result[h.key] = h.value;
      }
    }
  }
  return result;
}

// ── AC-1 — Content-Security-Policy ───────────────────────────────────────────

describe("Security Headers — AC-1: Content-Security-Policy", () => {
  it("CSP header is present", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Content-Security-Policy"]).toBeDefined();
  });

  it("CSP contains default-src 'self'", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("CSP contains connect-src 'self' (critical invariant — no external API calls)", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Content-Security-Policy"]).toContain("connect-src 'self'");
  });

  it("CSP contains frame-ancestors 'none'", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });

  it("CSP contains img-src 'self' data:", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Content-Security-Policy"]).toContain("img-src 'self' data:");
  });

  it("CSP contains script-src 'self' with unsafe-inline (documented trade-off for Next.js hydration)", async () => {
    const headers = await getHeadersForPath("/");
    const csp = headers["Content-Security-Policy"] ?? "";
    expect(csp).toContain("script-src 'self'");
    // 'unsafe-inline' is required for Next.js App Router hydration bootstrap scripts.
    // Nonce-based approach is tracked as follow-up.
    expect(csp).toContain("'unsafe-inline'");
  });

  it("CSP contains upgrade-insecure-requests", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
  });
});

// ── AC-2 — Strict-Transport-Security ─────────────────────────────────────────

describe("Security Headers — AC-2: HSTS", () => {
  it("HSTS header is present", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Strict-Transport-Security"]).toBeDefined();
  });

  it("HSTS value is exactly max-age=63072000; includeSubDomains; preload", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
  });
});

// ── AC-3 — Basic protection headers ──────────────────────────────────────────

describe("Security Headers — AC-3: Basic protection", () => {
  it("X-Content-Type-Options: nosniff", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("X-Frame-Options: DENY", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("X-XSS-Protection header is absent (deprecated, removed per security review)", async () => {
    const headers = await getHeadersForPath("/");
    // X-XSS-Protection is deprecated in Chrome 78+ and has a known IE8/IE9 exploit.
    // CSP script-src handles XSS for all supported browsers.
    expect(headers["X-XSS-Protection"]).toBeUndefined();
  });

  it("Referrer-Policy: strict-origin-when-cross-origin", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("Permissions-Policy: camera=(), microphone=(), geolocation=()", async () => {
    const headers = await getHeadersForPath("/");
    expect(headers["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
  });
});

// ── AC-4 — /api/times has Cache-Control: no-store ────────────────────────────

describe("Route Handler — AC-4: /api/times cache", () => {
  it("GET /api/catalogue returns Cache-Control: no-store", async () => {
    // Test via the route handler directly
    const { GET } = await import("@/app/api/times/route");
    const req = new Request("http://localhost/api/times");
    const { NextRequest } = await import("next/server");
    const response = await GET(new NextRequest(req));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

// ── AC-5 — /api/catalogue has public cache ────────────────────────────────────

describe("Route Handler — AC-5: /api/catalogue cache", () => {
  it("GET /api/catalogue returns Cache-Control with public max-age=86400", async () => {
    const { GET } = await import("@/app/api/catalogue/route");
    const response = GET();
    const cc = response.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=86400");
    expect(cc).toContain("stale-while-revalidate=3600");
  });
});

// ── AC-6 — CSP invariant: connect-src 'self' prevents external API calls ─────

describe("Security Headers — AC-6: CSP connect-src invariant", () => {
  it("connect-src is exactly 'self' — no external hostnames allowed", async () => {
    const headers = await getHeadersForPath("/");
    const csp = headers["Content-Security-Policy"] ?? "";

    // Extract connect-src directive value
    const connectSrcMatch = csp.match(/connect-src([^;]+)/);
    expect(connectSrcMatch).not.toBeNull();
    const connectSrcValue = connectSrcMatch![1].trim();

    // Must only contain 'self' — no external domains
    expect(connectSrcValue).toBe("'self'");
  });
});
