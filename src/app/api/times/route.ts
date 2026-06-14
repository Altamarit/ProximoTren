import { NextRequest, NextResponse } from "next/server";
import { anonymizeIP } from "@/lib/anonymize-ip";
import { logger } from "@/lib/logger";

/**
 * GET /api/times
 *
 * BFF Route Handler — Orquestación (E4-S4).
 * Privacy by Design: anonymizeIP is called as the VERY FIRST operation
 * before any context variable or log entry is created (Art. 25 GDPR, NFR-007).
 *
 * The raw IP MUST NOT propagate beyond the anonymizeIP call site.
 * The anonymized value (anonIP) is available for audit context if the
 * AuditEvent schema ever requires it — currently it does not.
 *
 * Full BFF logic (FallbackChain + CacheStore + adapter) is implemented in E4-S4.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Privacy by Design: IP anonymization ──────────────────────────────────
  // First operation — anonymizeIP owns proxy-chain extraction internally.
  // The raw x-forwarded-for value (which may be a comma-separated chain) is
  // passed directly; anonymizeIP splits on "," and returns the anonymized
  // first value.  rawIP is never assigned to any variable.
  const anonIP = anonymizeIP(
    request.headers.get("x-forwarded-for") ?? "unknown"
  );

  // ── Stub — full implementation in E4-S4 ──────────────────────────────────
  // anonIP is GDPR-safe to log (anonymized); included for observability.
  logger.info("GET /api/times received", { path: "/api/times", ip: anonIP });

  return NextResponse.json(
    { error: "Not implemented — see E4-S4" },
    { status: 501 }
  );
}
