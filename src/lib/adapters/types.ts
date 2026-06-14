import { z } from "zod";

// ── Request params ────────────────────────────────────────────────────────────

export const TimesRequestParamsSchema = z.object({
  stationId: z.string().min(1),
  lineId: z.string().min(1),
  direction: z.string().min(1),
});

export type TimesRequestParams = z.infer<typeof TimesRequestParamsSchema>;

// ── Raw CRTM response ─────────────────────────────────────────────────────────

export const RawTrainSchema = z.object({
  eta_minutes: z.number().int().nonnegative(),
  destination: z.string().min(1),
  platform: z.string().min(1),
});

export type RawTrain = z.infer<typeof RawTrainSchema>;

export const RawTransportResponseSchema = z.object({
  station_id: z.string().min(1),
  line_id: z.string().min(1),
  direction: z.string().min(1),
  trains: z.array(RawTrainSchema).min(1),
  fetched_at_iso: z.string().datetime({ offset: true }),
});

export type RawTransportResponse = z.infer<typeof RawTransportResponseSchema>;

// ── TransportAdapter interface ────────────────────────────────────────────────

export interface TransportAdapter {
  getTrainTimes(params: TimesRequestParams): Promise<RawTransportResponse>;
}

// ── Typed errors ──────────────────────────────────────────────────────────────

export class CRTMAPIError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "CRTMAPIError";
  }
}

export class CRTMTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`CRTM request timed out after ${timeoutMs}ms`);
    this.name = "CRTMTimeoutError";
  }
}
