import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CRTMAdapter } from "@/lib/adapters/crtm-adapter";
import { CRTMAPIError, CRTMTimeoutError } from "@/lib/adapters/types";

const validCRTMPayload = {
  station_id: "PAR_SOL",
  line_id: "L1",
  direction: "Valdecarros",
  trains: [{ eta_minutes: 2, destination: "Valdecarros", platform: "1" }],
  fetched_at_iso: "2026-06-14T10:00:00Z",
};

const validParams = { stationId: "PAR_SOL", lineId: "L1", direction: "Valdecarros" };

describe("CRTMAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("AC-1 — URL and headers", () => {
    it("sends Authorization: Bearer header with API key", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validCRTMPayload,
      });
      vi.stubGlobal("fetch", fetchMock);

      const adapter = new CRTMAdapter("https://api.crtm.es/v1", "test-key-123");
      await adapter.getTrainTimes(validParams);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-key-123");
    });

    it("URL contains all three context parameters", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validCRTMPayload,
      });
      vi.stubGlobal("fetch", fetchMock);

      const adapter = new CRTMAdapter("https://api.crtm.es/v1", "key");
      await adapter.getTrainTimes(validParams);

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("stationId=PAR_SOL");
      expect(url).toContain("lineId=L1");
      expect(url).toContain("direction=Valdecarros");
    });
  });

  describe("AC-2 — Timeout", () => {
    it("throws CRTMTimeoutError when request is aborted after 5 s", async () => {
      vi.useFakeTimers();

      const fetchMock = vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          })
      );
      vi.stubGlobal("fetch", fetchMock);

      const adapter = new CRTMAdapter("https://api.crtm.es/v1", "key", 5000);
      const promise = adapter.getTrainTimes(validParams);
      // Attach handler BEFORE advancing timers to prevent unhandled rejection
      const assertion = expect(promise).rejects.toBeInstanceOf(CRTMTimeoutError);
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
    });

    it("CRTMTimeoutError carries the configured timeout value", async () => {
      vi.useFakeTimers();

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(
          (_url: string, init: RequestInit) =>
            new Promise<Response>((_, reject) => {
              init.signal?.addEventListener("abort", () => {
                reject(new DOMException("Aborted", "AbortError"));
              });
            })
        )
      );

      const adapter = new CRTMAdapter("https://api.crtm.es/v1", "key", 5000);
      const promise = adapter.getTrainTimes(validParams);
      // Attach catch BEFORE advancing timers to prevent unhandled rejection
      const caught = promise.catch((e: unknown) => e as CRTMTimeoutError);
      await vi.advanceTimersByTimeAsync(5000);

      const err = await caught;
      expect(err).toBeInstanceOf(CRTMTimeoutError);
      expect((err as CRTMTimeoutError).timeoutMs).toBe(5000);
    });
  });

  describe("AC-3 — HTTP error", () => {
    it("throws CRTMAPIError with statusCode 503 on HTTP 503", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 503 })
      );

      const adapter = new CRTMAdapter("https://api.crtm.es/v1", "key");
      await expect(adapter.getTrainTimes(validParams)).rejects.toBeInstanceOf(CRTMAPIError);
    });

    it("CRTMAPIError carries the correct statusCode", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 429 })
      );

      const adapter = new CRTMAdapter("https://api.crtm.es/v1", "key");
      const err = await adapter.getTrainTimes(validParams).catch((e: unknown) => e);
      expect((err as CRTMAPIError).statusCode).toBe(429);
    });
  });

  describe("AC-4 — API key security", () => {
    it("does not expose API key in error messages", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 503 })
      );

      const secretKey = "super-secret-crtm-api-key-xyz";
      const adapter = new CRTMAdapter("https://api.crtm.es/v1", secretKey);
      const err = await adapter.getTrainTimes(validParams).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toContain(secretKey);
    });
  });

  describe("AC-5 — Happy path", () => {
    it("returns parsed RawTransportResponse on valid CRTM response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => validCRTMPayload,
        })
      );

      const adapter = new CRTMAdapter("https://api.crtm.es/v1", "key");
      const result = await adapter.getTrainTimes(validParams);

      expect(result.station_id).toBe("PAR_SOL");
      expect(result.trains).toHaveLength(1);
      expect(result.trains[0].eta_minutes).toBe(2);
    });
  });
});
