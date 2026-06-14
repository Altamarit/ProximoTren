import type { RawTransportResponse } from "@/lib/adapters/types";

// ── CacheEntry ────────────────────────────────────────────────────────────────

export interface CacheEntry {
  readonly cache_key: string;
  readonly payload: RawTransportResponse;
  readonly cached_at_iso: string;
}

// ── CacheStore interface ──────────────────────────────────────────────────────
// Abstract interface — allows swapping in-memory for Upstash Redis EU in Phase 2
// without changing any business logic.

export interface CacheStore {
  get(key: string): CacheEntry | null;
  set(key: string, payload: RawTransportResponse, cachedAt: Date): void;
  shouldCallCRTM(key: string, ttlSeconds: number): boolean;
  clear(): void;
}

// ── InMemoryCacheStore ────────────────────────────────────────────────────────

export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): CacheEntry | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, payload: RawTransportResponse, cachedAt: Date): void {
    this.store.set(key, {
      cache_key: key,
      payload,
      cached_at_iso: cachedAt.toISOString(),
    });
  }

  shouldCallCRTM(key: string, ttlSeconds: number): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    const ageMs = Date.now() - new Date(entry.cached_at_iso).getTime();
    return ageMs >= ttlSeconds * 1000;
  }

  clear(): void {
    this.store.clear();
  }
}

// ── Singleton for server runtime ──────────────────────────────────────────────
// Next.js Route Handlers run in the same process — one instance per cold start.

let instance: InMemoryCacheStore | null = null;

export function getCacheStore(): InMemoryCacheStore {
  if (!instance) {
    instance = new InMemoryCacheStore();
  }
  return instance;
}
