import { z } from "zod";

// ── BFF Response contract (mirrors FallbackResponse from fallback-chain.ts)
// Re-defined here as client-side Zod schema for parse/validation in the UI.

export const TrainSchema = z.object({
  eta_minutes: z.number().int().nonnegative(),
  destination: z.string().min(1),
  platform: z.string().min(1),
});

export type Train = z.infer<typeof TrainSchema>;

export const BFFResponseSchema = z.object({
  source: z.enum(["live", "cache", "empty"]),
  data: z
    .object({
      station_id: z.string().min(1),
      line_id: z.string().min(1),
      direction: z.string().min(1),
      trains: z.array(TrainSchema).min(1),
      fetched_at_iso: z.string(),
    })
    .nullable(),
  timestamp: z.string(),
  cache_age_seconds: z.number().nullable(),
  error_context: z
    .object({
      message: z.string(),
      // Named literal union prevents magic-string comparisons across the codebase.
      // Server-side values: CRTMAPIError, CRTMTimeoutError.
      // Client-side values: FetchError, NetworkError, NoService, ParseError.
      type: z.enum(["CRTMAPIError", "CRTMTimeoutError", "FetchError", "NetworkError", "NoService", "ParseError"]),
    })
    .nullable(),
});

export type BFFResponse = z.infer<typeof BFFResponseSchema>;

// ── UIState ───────────────────────────────────────────────────────────────────
// The four exclusive states the main screen can be in.

export type UIState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "live"; data: BFFResponse }
  | { status: "cache"; data: BFFResponse }
  | { status: "empty"; errorContext: BFFResponse["error_context"] };
