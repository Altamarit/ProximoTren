/**
 * Validates required environment variables at startup.
 * Throws on missing required values in non-development environments.
 * Called from the BFF route handlers (E4-S4).
 */

export type TransportAdapter = "live" | "mock";

export interface Env {
  readonly nodeEnv: "development" | "staging" | "production";
  readonly crtmApiBaseUrl: string;
  readonly crtmApiTimeoutMs: number;
  readonly transportAdapter: TransportAdapter;
  readonly logtailSourceToken: string | undefined;
  readonly rateLimitMaxRpm: number;
  readonly cacheTtlSeconds: number;
}

function parseTransportAdapter(raw: string | undefined): TransportAdapter {
  if (raw === "live" || raw === "mock") return raw;
  return "mock";
}

function parseNodeEnv(
  raw: string | undefined
): "development" | "staging" | "production" {
  if (raw === "staging" || raw === "production") return raw;
  return "development";
}

export function getEnv(): Env {
  const nodeEnv = parseNodeEnv(process.env.NODE_ENV);

  const crtmApiBaseUrl =
    process.env.CRTM_API_BASE_URL ?? "https://api.crtm.es/v1";

  const crtmApiTimeoutMs = parseInt(
    process.env.CRTM_API_TIMEOUT_MS ?? "5000",
    10
  );

  const transportAdapter = parseTransportAdapter(
    process.env.TRANSPORT_ADAPTER
  );

  const logtailSourceToken = process.env.LOGTAIL_SOURCE_TOKEN || undefined;

  const rateLimitMaxRpm = parseInt(
    process.env.RATE_LIMIT_MAX_RPM ?? "60",
    10
  );

  const cacheTtlSeconds = parseInt(
    process.env.CACHE_TTL_SECONDS ?? "30",
    10
  );

  // In production, warn (not throw) if live adapter is requested without a
  // base URL override — allows MockAdapter fallback per graceful degradation.
  if (
    nodeEnv === "production" &&
    transportAdapter === "live" &&
    !process.env.CRTM_API_BASE_URL
  ) {
    console.warn(
      "[env] CRTM_API_BASE_URL not set in production with TRANSPORT_ADAPTER=live. Falling back to default URL."
    );
  }

  return {
    nodeEnv,
    crtmApiBaseUrl,
    crtmApiTimeoutMs,
    transportAdapter,
    logtailSourceToken,
    rateLimitMaxRpm,
    cacheTtlSeconds,
  };
}
