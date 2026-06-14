import { z } from "zod";

/**
 * AuditEvent -- structured log record emitted by the BFF for every significant operation.
 * Serialized as JSON Lines to stdout; Vercel captures stdout and forwards via Log Drains.
 *
 * Privacy by Design (Art. 25 GDPR, NFR-007):
 *   - No `ip` field  -- anonymized upstream; anonymized value not stored here.
 *   - No `user_agent` field -- excluded entirely (not anonymized, simply not recorded).
 *   - No `headers` field -- HTTP headers are never persisted.
 *   - No `device_id` field -- not collected.
 */

// Extend this enum when new event types are introduced (E7-S3+)
export const AuditEventTypeSchema = z.enum([
  "crtm_request",
  "crtm_error",
  "cache_hit",
  "bff_error",
  "service_lifecycle",
]);

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

export const AuditEventSchema = z.object({
  /** ISO 8601 UTC timestamp -- when the event was emitted */
  timestamp: z.string().datetime({ offset: true }),
  /** Discriminant for log routing and alerting */
  event_type: AuditEventTypeSchema,
  /** Nullable -- not all event types have a station context */
  station_id: z.string().nullable(),
  line_id: z.string().nullable(),
  direction: z.string().nullable(),
  /** HTTP response code sent to the client; null for lifecycle events */
  response_code: z.number().int().min(0).nullable(),
  /** End-to-end BFF latency in ms; null when not measurable */
  latency_ms: z.number().int().nonnegative().nullable(),
  /** Whether the response was served from cache */
  cache_hit: z.boolean(),
  /** Age of cache entry in seconds; null when cache_hit is false */
  cache_age_s: z.number().int().nonnegative().nullable(),
  /**
   * Sanitized error detail -- any IPv4 patterns replaced with [IP_REDACTED].
   * Never contains raw PII.
   */
  error_detail: z.string().nullable(),
  /** Reflects TRANSPORT_ADAPTER=mock or MOCK_MODE=true env var */
  mock_mode: z.boolean(),
  /** Semver string from npm_package_version; fallback "0.0.0" */
  bff_version: z.string(),
  /** UUID v4 -- unique per HTTP request */
  request_id: z.string().uuid(),
  /** Multi-tenancy support -- "default" in Phase 1 */
  tenant_id: z.string().min(1),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
