import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCacheStore } from "@/lib/cache/cache-store";
import type { RawTransportResponse } from "@/lib/adapters/types";

const makePayload = (stationId: string): RawTransportResponse => ({
  station_id: stationId,
  line_id: "L1",
  direction: "Valdecarros",
  trains: [{ eta_minutes: 3, destination: "Valdecarros", platform: "Andén 1" }],
  fetched_at_iso: new Date().toISOString(),
});

describe("InMemoryCacheStore", () => {
  let cache: InMemoryCacheStore;

  beforeEach(() => {
    cache = new InMemoryCacheStore();
  });

  it("returns null for a key that has never been set", () => {
    expect(cache.get("PAR_SOL:L1:Valdecarros")).toBeNull();
  });

  it("stores and retrieves a payload by key", () => {
    const payload = makePayload("PAR_SOL");
    const now = new Date();
    cache.set("PAR_SOL:L1:Valdecarros", payload, now);

    const entry = cache.get("PAR_SOL:L1:Valdecarros");
    expect(entry).not.toBeNull();
    expect(entry?.cache_key).toBe("PAR_SOL:L1:Valdecarros");
    expect(entry?.payload).toEqual(payload);
    expect(entry?.cached_at_iso).toBe(now.toISOString());
  });

  it("isolates distinct keys — returns null for a different key", () => {
    cache.set("PAR_SOL:L1:Valdecarros", makePayload("PAR_SOL"), new Date());
    cache.set("PAR_NUEVOSMIN:L10:Puerta del Sur", makePayload("PAR_NUEVOSMIN"), new Date());

    expect(cache.get("PAR_SOL:L2:Cuatro Caminos")).toBeNull();
  });

  it("overwrites an existing entry on set", () => {
    const first = makePayload("PAR_SOL");
    const second = { ...makePayload("PAR_SOL"), direction: "Pinar de Chamartín" };
    cache.set("key", first, new Date());
    cache.set("key", second, new Date());

    expect(cache.get("key")?.payload.direction).toBe("Pinar de Chamartín");
  });

  describe("shouldCallCRTM", () => {
    it("returns true when key is not in cache", () => {
      expect(cache.shouldCallCRTM("missing:key", 30)).toBe(true);
    });

    it("returns false when entry is within TTL window", () => {
      cache.set("key", makePayload("PAR_SOL"), new Date());
      expect(cache.shouldCallCRTM("key", 30)).toBe(false);
    });

    it("returns true when entry is older than TTL", () => {
      const oldDate = new Date(Date.now() - 31_000); // 31 seconds ago
      cache.set("key", makePayload("PAR_SOL"), oldDate);
      expect(cache.shouldCallCRTM("key", 30)).toBe(true);
    });

    it("respects custom TTL of 0 — always calls CRTM", () => {
      cache.set("key", makePayload("PAR_SOL"), new Date());
      expect(cache.shouldCallCRTM("key", 0)).toBe(true);
    });
  });

  it("clear() removes all entries", () => {
    cache.set("key1", makePayload("A"), new Date());
    cache.set("key2", makePayload("B"), new Date());
    cache.clear();
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
  });
});
