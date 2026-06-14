import { NextRequest, NextResponse } from "next/server";
import { anonymizeIP } from "@/lib/anonymize-ip";
import { logAuditEvent, createAuditEvent } from "@/lib/audit-logger";
import { randomUUID } from "crypto";

/**
 * GET /api/times
 *
 * BFF Route Handler — Orquestación (E4-S4).
 * Privacy by Design: anonymizeIP is called as the VERY FIRST operation
 * before any context variable or log entry is created (Art. 25 GDPR, NFR-007).
 *
 * The raw IP MUST NOT propagate beyond the anonymizeIP call site.
 * Full BFF logic (FallbackChain + CacheStore + adapter) is implemented in E4-S4.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();

  // ── Privacy by Design: IP anonymization ──────────────────────────────────
  // First operation — anonymizeIP owns proxy-chain extraction internally.
  // rawIP is never assigned to any variable beyond this call.
  void anonymizeIP(request.headers.get("x-forwarded-for") ?? "unknown");

  const requestId = randomUUID();

  // ── Stub — full implementation in E4-S4 ──────────────────────────────────
  logAuditEvent(
    createAuditEvent({
      event_type: "service_lifecycle",
      request_id: requestId,
      response_code: 501,
      latency_ms: Date.now() - startMs,
      error_detail: "Not implemented — see E4-S4",
    })
  );

  return NextResponse.json(
    { error: "Not implemented — see E4-S4" },
    {
      status: 501,
      headers: {
        // AC-4 (E7-S3): Live train times must never be cached by browser or proxies.
        "Cache-Control": "no-store",
      },
    }
  );
}
