import type { TransportAdapter, TimesRequestParams, RawTransportResponse } from "@/lib/adapters/types";
import type { CacheStore } from "@/lib/cache/cache-store";

// ── Response contract ─────────────────────────────────────────────────────────

export interface FallbackResponse {
  readonly source: "live" | "cache" | "empty";
  readonly data: RawTransportResponse | null;
  readonly timestamp: string;
  readonly cache_age_seconds: number | null;
  readonly error_context: { message: string; type: string } | null;
}

// ── FallbackChain ─────────────────────────────────────────────────────────────
// Implements CA-5: three levels
//   Nivel 1 (live)  — CRTM responds OK, cache is stale / empty
//   Nivel 1 (cache) — cache is fresh (< TTL) → rate-limited, skip CRTM
//   Nivel 2 (cache) — CRTM fails, stale cache entry exists
//   Nivel 3 (empty) — CRTM fails, cache is empty

export class FallbackChain {
  constructor(
    private readonly adapter: TransportAdapter,
    private readonly cache: CacheStore,
    private readonly ttlSeconds: number
  ) {}

  async execute(params: TimesRequestParams): Promise<FallbackResponse> {
    const key = `${params.stationId}:${params.lineId}:${params.direction}`;
    const now = new Date();

    // ── Nivel 1 (rate-limited) — cache is fresh, skip CRTM ──────────────────
    if (!this.cache.shouldCallCRTM(key, this.ttlSeconds)) {
      const entry = this.cache.get(key)!;
      const ageSeconds = (now.getTime() - new Date(entry.cached_at_iso).getTime()) / 1000;
      return {
        source: "cache",
        data: entry.payload,
        timestamp: now.toISOString(),
        cache_age_seconds: Math.round(ageSeconds),
        error_context: null,
      };
    }

    // ── Nivel 1 (live) — try CRTM ───────────────────────────────────────────
    try {
      const data = await this.adapter.getTrainTimes(params);
      this.cache.set(key, data, now);
      return {
        source: "live",
        data,
        timestamp: now.toISOString(),
        cache_age_seconds: null,
        error_context: null,
      };
    } catch (err) {
      // ── Nivel 2 — stale cache ─────────────────────────────────────────────
      const entry = this.cache.get(key);
      if (entry) {
        const ageSeconds = (now.getTime() - new Date(entry.cached_at_iso).getTime()) / 1000;
        return {
          source: "cache",
          data: entry.payload,
          timestamp: now.toISOString(),
          cache_age_seconds: Math.round(ageSeconds),
          error_context: null,
        };
      }

      // ── Nivel 3 — empty ───────────────────────────────────────────────────
      return {
        source: "empty",
        data: null,
        timestamp: now.toISOString(),
        cache_age_seconds: null,
        error_context: {
          message: err instanceof Error ? err.message : "Unknown error",
          type: err instanceof Error ? err.name : "UnknownError",
        },
      };
    }
  }
}
