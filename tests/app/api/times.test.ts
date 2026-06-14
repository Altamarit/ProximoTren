import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/times");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

const VALID_PARAMS = {
  stationId: "PAR_SOL",
  lineId: "L1",
  direction: "Valdecarros",
};

// Mock chain result factory
const mockLiveResult = {
  source: "live" as const,
  data: {
    station_id: "PAR_SOL",
    line_id: "L1",
    direction: "Valdecarros",
    trains: [
      { eta_minutes: 3, destination: "Valdecarros", platform: "1" },
      { eta_minutes: 8, destination: "Valdecarros", platform: "1" },
    ],
    fetched_at_iso: "2026-06-14T10:00:00+00:00",
  },
  timestamp: "2026-06-14T10:00:00.000Z",
  cache_age_seconds: null,
  error_context: null,
};

const mockCacheResult = {
  ...mockLiveResult,
  source: "cache" as const,
  cache_age_seconds: 15,
};

const mockEmptyResult = {
  source: "empty" as const,
  data: null,
  timestamp: "2026-06-14T10:00:00.000Z",
  cache_age_seconds: null,
  error_context: { message: "CRTM timeout", type: "CRTMTimeoutError" },
};

// We mock the FallbackChain and adapter at module level so GET uses MockAdapter
vi.mock("@/lib/adapters/crtm-adapter", () => ({
  CRTMAdapter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/lib/adapters/mock-adapter", () => ({
  MockAdapter: vi.fn().mockImplementation(() => ({})),
}));

const mockExecute = vi.fn();
vi.mock("@/lib/fallback-chain", () => ({
  FallbackChain: vi.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

vi.mock("@/lib/audit-logger", () => ({
  logAuditEvent: vi.fn(),
  createAuditEvent: vi.fn((p: unknown) => p),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/times", () => {
  describe("400 — Missing / invalid params", () => {
    it("returns 400 when stationId is missing", async () => {
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest({ lineId: "L1", direction: "Valdecarros" }));
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toContain("stationId");
    });

    it("returns 400 when lineId is missing", async () => {
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest({ stationId: "PAR_SOL", direction: "Valdecarros" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when direction is missing", async () => {
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest({ stationId: "PAR_SOL", lineId: "L1" }));
      expect(res.status).toBe(400);
    });

    it("400 response has Cache-Control: no-store", async () => {
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest({}));
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("200 — Live response", () => {
    it("returns 200 with live data from FallbackChain", async () => {
      mockExecute.mockResolvedValueOnce(mockLiveResult);
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest(VALID_PARAMS));
      expect(res.status).toBe(200);
      const body = await res.json() as typeof mockLiveResult;
      expect(body.source).toBe("live");
      expect(body.data?.trains).toHaveLength(2);
    });

    it("200 response has Cache-Control: no-store", async () => {
      mockExecute.mockResolvedValueOnce(mockLiveResult);
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest(VALID_PARAMS));
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });
  });

  describe("200 — Cache response", () => {
    it("returns 200 with cache data from FallbackChain", async () => {
      mockExecute.mockResolvedValueOnce(mockCacheResult);
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest(VALID_PARAMS));
      expect(res.status).toBe(200);
      const body = await res.json() as typeof mockCacheResult;
      expect(body.source).toBe("cache");
      expect(body.cache_age_seconds).toBe(15);
    });
  });

  describe("200 — Empty response (graceful degradation)", () => {
    it("returns 200 with empty source when FallbackChain returns empty", async () => {
      mockExecute.mockResolvedValueOnce(mockEmptyResult);
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest(VALID_PARAMS));
      expect(res.status).toBe(200);
      const body = await res.json() as typeof mockEmptyResult;
      expect(body.source).toBe("empty");
      expect(body.data).toBeNull();
    });
  });

  describe("Query params forwarded to FallbackChain", () => {
    it("calls chain.execute with the correct params", async () => {
      mockExecute.mockResolvedValueOnce(mockLiveResult);
      const { GET } = await import("@/app/api/times/route");
      await GET(makeRequest(VALID_PARAMS));
      expect(mockExecute).toHaveBeenCalledWith({
        stationId: "PAR_SOL",
        lineId: "L1",
        direction: "Valdecarros",
      });
    });
  });

  describe("Audit logging", () => {
    it("calls logAuditEvent after a successful live response", async () => {
      const { logAuditEvent } = await import("@/lib/audit-logger");
      mockExecute.mockResolvedValueOnce(mockLiveResult);
      const { GET } = await import("@/app/api/times/route");
      await GET(makeRequest(VALID_PARAMS));
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it("calls logAuditEvent with bff_error on 400 response", async () => {
      const { logAuditEvent } = await import("@/lib/audit-logger");
      const { GET } = await import("@/app/api/times/route");
      await GET(makeRequest({}));
      expect(logAuditEvent).toHaveBeenCalled();
    });
  });

  describe("500 — Unexpected exception (Non-Negotiable #3)", () => {
    it("returns 500 and does not throw if FallbackChain unexpectedly throws", async () => {
      mockExecute.mockRejectedValueOnce(new Error("unexpected crash"));
      const { GET } = await import("@/app/api/times/route");
      const res = await GET(makeRequest(VALID_PARAMS));
      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("Internal server error");
    });
  });
});
