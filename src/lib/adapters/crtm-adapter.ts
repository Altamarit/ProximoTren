import type { TransportAdapter, TimesRequestParams, RawTransportResponse } from "@/lib/adapters/types";
import { RawTransportResponseSchema, CRTMAPIError, CRTMTimeoutError } from "@/lib/adapters/types";

export class CRTMAdapter implements TransportAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    baseUrl = process.env.CRTM_API_BASE_URL ?? "https://api.crtm.es/v1",
    apiKey = process.env.CRTM_API_KEY ?? "",
    timeoutMs = parseInt(process.env.CRTM_API_TIMEOUT_MS ?? "5000", 10)
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async getTrainTimes(params: TimesRequestParams): Promise<RawTransportResponse> {
    const url = new URL(`${this.baseUrl}/times`);
    url.searchParams.set("stationId", params.stationId);
    url.searchParams.set("lineId", params.lineId);
    url.searchParams.set("direction", params.direction);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new CRTMAPIError(
          response.status,
          `CRTM API responded with HTTP ${response.status}`
        );
      }

      const data: unknown = await response.json();
      return RawTransportResponseSchema.parse(data);
    } catch (err) {
      if (err instanceof CRTMAPIError) throw err;
      if (controller.signal.aborted) throw new CRTMTimeoutError(this.timeoutMs);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
