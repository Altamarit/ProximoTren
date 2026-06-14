import { randomUUID } from "crypto";
import pkg from "../../package.json";
import { AuditEventSchema } from "@/lib/schemas/audit-event.schema";
import type { AuditEvent } from "@/lib/schemas/audit-event.schema";

// ── sanitizeErrorDetail ──────────────────────────────────────────────────
// Replace IP addresses in error messages with [IP_REDACTED] before logging.
// Defence-in-depth: error strings from CRTM may contain IP addresses (GDPR Art.25).
// Word boundaries on IPv4 prevent false-positive redaction of version strings.

// IPv4: \b prevents matching "1.0.0.0" in "version 1.0.0.0"
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
// IPv6: colon-hex groups (abbreviated or full form)
const IPV6_PATTERN = /(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}/g;

function sanitizeErrorDetail(detail: string | null): string | null {
  if (detail === null) return null;
  return detail
    .replace(IPV4_PATTERN, "[IP_REDACTED]")
    .replace(IPV6_PATTERN, "[IP_REDACTED]");
}

// ── logAuditEvent ──────────────────────────────────────────────────────────────
// Validates the event against AuditEventSchema at runtime, sanitizes error_detail,
// then writes a single JSON Line to stdout.
//
// NEVER throws — any internal failure emits a service_lifecycle fallback event
// instead of propagating to the Route Handler (Non-Negotiable #3).

export function logAuditEvent(event: AuditEvent): void {
  try {
    const result = AuditEventSchema.safeParse(event);

    if (!result.success) {
      // Validation failed — emit a safe fallback lifecycle event
      const fallback: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        event_type: "service_lifecycle",
        station_id: null,
        line_id: null,
        direction: null,
        response_code: null,
        latency_ms: null,
        cache_hit: false,
        cache_age_s: null,
        error_detail: `AuditEvent validation failed: ${result.error.message}`,
        mock_mode: process.env.MOCK_MODE === "true",
        bff_version: pkg.version,
        request_id: randomUUID(),
        tenant_id: "default",
      };
      console.log(JSON.stringify(fallback));
      return;
    }

    // Sanitize error_detail before writing to stdout
    const sanitized: AuditEvent = {
      ...result.data,
      error_detail: sanitizeErrorDetail(result.data.error_detail),
    };

    console.log(JSON.stringify(sanitized));
  } catch (err) {
    // Last-resort fallback: JSON.stringify failure or unexpected exception
    // Write a minimal safe string — never let logging crash the process
    try {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event_type: "service_lifecycle",
          error_detail: `logAuditEvent internal error: ${String(err)}`,
          tenant_id: "default",
          request_id: "00000000-0000-0000-0000-000000000000",
          mock_mode: process.env.MOCK_MODE === "true",
          bff_version: pkg.version,
          station_id: null,
          line_id: null,
          direction: null,
          response_code: null,
          latency_ms: null,
          cache_hit: false,
          cache_age_s: null,
        })
      );
    } catch {
      // stdout is closed — silently discard
    }
  }
}

// ── createAuditEvent ───────────────────────────────────────────────────────────
// Factory that fills in all default/invariant fields.
// The caller only needs to provide event-specific fields.

export function createAuditEvent(partial: Partial<AuditEvent>): AuditEvent {
  const base: AuditEvent = {
    timestamp: new Date().toISOString(),
    event_type: "service_lifecycle",
    station_id: null,
    line_id: null,
    direction: null,
    response_code: null,
    latency_ms: null,
    cache_hit: false,
    cache_age_s: null,
    error_detail: null,
    mock_mode: process.env.MOCK_MODE === "true",
    bff_version: pkg.version,
    request_id: randomUUID(),
    tenant_id: "default",
  };
  return { ...base, ...partial };
}
