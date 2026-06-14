import { z } from "zod";

/**
 * AuditEvent — structured log record emitted by the BFF on each /api/times call.
 *
 * Privacy by Design (Art. 25 GDPR):
 *   - No `ip` field: IP is anonymized before reaching this schema (see anonymize-ip.ts)
 *     and the anonymized value is NOT stored here either.
 *   - No `user_agent` field: User-Agent is excluded entirely — it is not transformed,
 *     merely not recorded. Exclusion is the privacy measure.
 */
export const AuditEventSchema = z.object({
  // Extend this enum when new event types are introduced (E7-S2+)
  event_type: z.enum(["times_request"]),
  station_id: z.string().min(1),
  line_id: z.string().min(1),
  direction: z.string().min(1),
  source: z.enum(["live", "cache", "empty"]),
  status_code: z.number().int().min(100).max(599),
  timestamp_iso: z.string().datetime({ offset: true }),
  duration_ms: z.number().nonnegative(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
