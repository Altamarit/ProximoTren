import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimesShell } from "@/hooks/useTimesShell";
import type { SelectedContext } from "@/types/context.types";

const ctx: SelectedContext = { stationId: "PAR_SOL", lineId: "L1", direction: "Valdecarros" };

const liveBFF = {
  source: "live",
  data: {
    station_id: "PAR_SOL",
    line_id: "L1",
    direction: "Valdecarros",
    trains: [
      { eta_minutes: 2, destination: "Valdecarros", platform: "1" },
      { eta_minutes: 7, destination: "Valdecarros", platform: "1" },
    ],
    fetched_at_iso: "2026-06-14T10:00:00Z",
  },
  timestamp: "2026-06-14T10:00:00Z",
  cache_age_seconds: null,
  error_context: null,
};

const cacheBFF = { ...liveBFF, source: "cache", cache_age_seconds: 45 };

const emptyBFF = {
  source: "empty",
  data: null,
  timestamp: "2026-06-14T10:00:00Z",
  cache_age_seconds: null,
  error_context: { message: "CRTM down", type: "CRTMAPIError" },
};

beforeEach(() => vi.restoreAllMocks());

describe("useTimesShell", () => {
  describe("AC-1 — Correct UIState transition on BFF response", () => {
    it("starts idle when context is null", () => {
      const { result } = renderHook(() => useTimesShell(null));
      expect(result.current.uiState.status).toBe("idle");
    });

    it("transitions to loading then live on successful BFF response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => liveBFF }));
      const { result } = renderHook(() => useTimesShell(ctx));
      expect(result.current.uiState.status).toBe("loading");
      await waitFor(() => expect(result.current.uiState.status).toBe("live"));
    });

    it("transitions to cache when BFF source is cache", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => cacheBFF }));
      const { result } = renderHook(() => useTimesShell(ctx));
      await waitFor(() => expect(result.current.uiState.status).toBe("cache"));
    });

    it("transitions to empty when BFF source is empty", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => emptyBFF }));
      const { result } = renderHook(() => useTimesShell(ctx));
      await waitFor(() => expect(result.current.uiState.status).toBe("empty"));
    });

    it("calls GET /api/times with all three context params", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => liveBFF });
      vi.stubGlobal("fetch", fetchMock);
      const { result } = renderHook(() => useTimesShell(ctx));
      await waitFor(() => expect(result.current.uiState.status).toBe("live"));
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("stationId=PAR_SOL");
      expect(url).toContain("lineId=L1");
      expect(url).toContain("direction=Valdecarros");
    });
  });

  describe("AC-2 — Loading state", () => {
    it("isRefreshing is false when idle", () => {
      const { result } = renderHook(() => useTimesShell(null));
      expect(result.current.isRefreshing).toBe(false);
    });

    it("transitions back to not-refreshing after fetch completes", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => liveBFF }));
      const { result } = renderHook(() => useTimesShell(ctx));
      await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    });
  });

  describe("AC-3 — empty on fetch error", () => {
    it("sets empty state when BFF returns non-2xx", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
      const { result } = renderHook(() => useTimesShell(ctx));
      await waitFor(() => expect(result.current.uiState.status).toBe("empty"));
    });
  });

  describe("refresh()", () => {
    it("triggers a new fetch", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => liveBFF });
      vi.stubGlobal("fetch", fetchMock);
      const { result } = renderHook(() => useTimesShell(ctx));
      await waitFor(() => expect(result.current.uiState.status).toBe("live"));
      act(() => result.current.refresh());
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });
  });
});
