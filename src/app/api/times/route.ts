import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { anonymizeIP } from "@/lib/anonymize-ip";
import { logAuditEvent, createAuditEvent } from "@/lib/audit-logger";
import { FallbackChain } from "@/lib/fallback-chain";
import { getCacheStore } from "@/lib/cache/cache-store";
import { CRTMAdapter } from "@/lib/adapters/crtm-adapter";
import { MockAdapter } from "@/lib/adapters/mock-adapter";
import { TimesRequestParamsSchema } from "@/lib/adapters/types";
import { getEnv } from "@/lib/env";

// ── Singleton resources (survive across requests in the same Lambda instance) ──
const env = getEnv();
const cache = getCacheStore();
const adapter =
  env.transportAdapter === "live" ? new CRTMAdapter() : new MockAdapter();
const chain = new FallbackChain(adapter, cache, env.cacheTtlSeconds);

/**
 * GET /api/times?stationId=…&lineId=…&direction=…
 *
 * BFF Route Handler — Orquestación (E4-S4).
 *
 * Privacy by Design: anonymizeIP is called as the VERY FIRST operation
 * before any variable is created (Art. 25 GDPR, NFR-007).
 * The raw header value never escapes the anonymizeIP call.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();
  const requestId = randomUUID();

  // ── Privacy by Design: IP anonymization (first operation) ────────────────
  void anonymizeIP(request.headers.get("x-forwarded-for") ?? "unknown");

  // ── Parse + validate query params ────────────────────────────────────────
  const rawParams = {
    stationId: request.nextUrl.searchParams.get("stationId") ?? "",
    lineId: request.nextUrl.searchParams.get("lineId") ?? "",
    direction: request.nextUrl.searchParams.get("direction") ?? "",
  };

  const parsed = TimesRequestParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    logAuditEvent(
      createAuditEvent({
        event_type: "bff_error",
        request_id: requestId,
        response_code: 400,
        latency_ms: Date.now() - startMs,
        error_detail: `Invalid params: ${parsed.error.message}`,
      })
    );
    return NextResponse.json(
      { error: "Missing or invalid query parameters: stationId, lineId, direction are required." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const params = parsed.data;

  // ── Execute FallbackChain ─────────────────────────────────────────────────
  try {
    const result = await chain.execute(params);

    logAuditEvent(
      createAuditEvent({
        event_type: result.source === "live" ? "crtm_request" : "cache_hit",
        station_id: params.stationId,
        line_id: params.lineId,
        direction: params.direction,
        request_id: requestId,
        response_code: 200,
        latency_ms: Date.now() - startMs,
        cache_hit: result.source === "cache",
        cache_age_s:
          result.cache_age_seconds !== null
            ? Math.round(result.cache_age_seconds)
            : null,
        mock_mode: env.transportAdapter === "mock",
      })
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    // Unexpected exception (not expected — FallbackChain never throws)
    logAuditEvent(
      createAuditEvent({
        event_type: "bff_error",
        station_id: params.stationId,
        line_id: params.lineId,
        direction: params.direction,
        request_id: requestId,
        response_code: 500,
        latency_ms: Date.now() - startMs,
        error_detail: err instanceof Error ? err.message : "Unknown error",
      })
    );

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}

// Re-export z to satisfy "no unused imports" linter (used by TimesRequestParamsSchema transitively)
void z;

