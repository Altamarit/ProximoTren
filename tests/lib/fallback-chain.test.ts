import { describe, it, expect, vi, beforeEach } from "vitest";
import { FallbackChain } from "@/lib/fallback-chain";
import { InMemoryCacheStore } from "@/lib/cache/cache-store";
import { CRTMAPIError, CRTMTimeoutError } from "@/lib/adapters/types";
import type { RawTransportResponse, TransportAdapter } from "@/lib/adapters/types";

const params = { stationId: "PAR_SOL", lineId: "L1", direction: "Valdecarros" };
const cacheKey = "PAR_SOL:L1:Valdecarros";

const livePayload: RawTransportResponse = {
  station_id: "PAR_SOL",
  line_id: "L1",
  direction: "Valdecarros",
  trains: [{ eta_minutes: 2, destination: "Valdecarros", platform: "1" }],
  fetched_at_iso: new Date().toISOString(),
};

function makeMockAdapter(impl: () => Promise<RawTransportResponse>): TransportAdapter {
  return { getTrainTimes: vi.fn().mockImplementation(impl) };
}

describe("FallbackChain", () => {
  let cache: InMemoryCacheStore;

  beforeEach(() => {
    cache = new InMemoryCacheStore();
  });

  describe("AC-1 — Nivel 1 live", () => {
    it("returns source: live when CRTM responds successfully", async () => {
      const adapter = makeMockAdapter(() => Promise.resolve(livePayload));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.source).toBe("live");
    });

    it("result has data, timestamp, cache_age_seconds null, error_context null", async () => {
      const adapter = makeMockAdapter(() => Promise.resolve(livePayload));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.data).toEqual(livePayload);
      expect(result.timestamp).toBeTruthy();
      expect(result.cache_age_seconds).toBeNull();
      expect(result.error_context).toBeNull();
    });

    it("updates the cache after a live fetch", async () => {
      const adapter = makeMockAdapter(() => Promise.resolve(livePayload));
      const chain = new FallbackChain(adapter, cache, 30);

      await chain.execute(params);
      expect(cache.get(cacheKey)).not.toBeNull();
    });
  });

  describe("AC-2 — Nivel 1 rate-limited (cache fresh)", () => {
    it("returns source: cache when entry is fresh (< TTL)", async () => {
      cache.set(cacheKey, livePayload, new Date());
      const adapter = makeMockAdapter(() => Promise.resolve(livePayload));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.source).toBe("cache");
    });

    it("does NOT call the adapter when cache is fresh", async () => {
      cache.set(cacheKey, livePayload, new Date());
      const adapter = makeMockAdapter(() => Promise.resolve(livePayload));
      const chain = new FallbackChain(adapter, cache, 30);

      await chain.execute(params);
      expect(adapter.getTrainTimes).not.toHaveBeenCalled();
    });

    it("cache_age_seconds is a non-negative number", async () => {
      cache.set(cacheKey, livePayload, new Date());
      const chain = new FallbackChain(makeMockAdapter(() => Promise.resolve(livePayload)), cache, 30);

      const result = await chain.execute(params);
      expect(result.cache_age_seconds).not.toBeNull();
      expect(result.cache_age_seconds!).toBeGreaterThanOrEqual(0);
    });
  });

  describe("AC-3 — Nivel 2 stale cache on CRTM failure", () => {
    it("returns source: cache with stale entry when CRTM throws CRTMAPIError", async () => {
      const oldDate = new Date(Date.now() - 120_000); // 2 min ago
      cache.set(cacheKey, livePayload, oldDate);
      const adapter = makeMockAdapter(() => Promise.reject(new CRTMAPIError(503, "CRTM down")));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.source).toBe("cache");
      expect(result.data).toEqual(livePayload);
      expect(result.error_context).toBeNull();
    });

    it("returns source: cache when CRTM times out but stale cache exists", async () => {
      const oldDate = new Date(Date.now() - 60_000);
      cache.set(cacheKey, livePayload, oldDate);
      const adapter = makeMockAdapter(() => Promise.reject(new CRTMTimeoutError(5000)));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.source).toBe("cache");
    });

    it("cache_age_seconds is > 30 for stale entry", async () => {
      const oldDate = new Date(Date.now() - 60_000);
      cache.set(cacheKey, livePayload, oldDate);
      const adapter = makeMockAdapter(() => Promise.reject(new CRTMAPIError(503, "down")));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.cache_age_seconds!).toBeGreaterThan(30);
    });
  });

  describe("AC-4 — Nivel 3 empty (no cache, CRTM fails)", () => {
    it("returns source: empty when cache is empty and CRTM fails", async () => {
      const adapter = makeMockAdapter(() => Promise.reject(new CRTMAPIError(503, "CRTM down")));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.source).toBe("empty");
    });

    it("result has data: null and error_context with message and type", async () => {
      const adapter = makeMockAdapter(() => Promise.reject(new CRTMAPIError(503, "Service Unavailable")));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.data).toBeNull();
      expect(result.error_context).not.toBeNull();
      expect(result.error_context!.message).toBeTruthy();
      expect(result.error_context!.type).toBe("CRTMAPIError");
    });

    it("cache_age_seconds is null for empty level", async () => {
      const adapter = makeMockAdapter(() => Promise.reject(new CRTMTimeoutError(5000)));
      const chain = new FallbackChain(adapter, cache, 30);

      const result = await chain.execute(params);
      expect(result.cache_age_seconds).toBeNull();
    });
  });
});
