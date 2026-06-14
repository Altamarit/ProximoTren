import { describe, it, expect } from "vitest";
import {
  TimesRequestParamsSchema,
  RawTransportResponseSchema,
  CRTMAPIError,
  CRTMTimeoutError,
} from "@/lib/adapters/types";

const validParams = {
  stationId: "PAR_SOL",
  lineId: "L1",
  direction: "Valdecarros",
};

const validRawResponse = {
  station_id: "PAR_SOL",
  line_id: "L1",
  direction: "Valdecarros",
  trains: [
    { eta_minutes: 2, destination: "Valdecarros", platform: "Andén 1" },
    { eta_minutes: 7, destination: "Valdecarros", platform: "Andén 1" },
  ],
  fetched_at_iso: "2026-06-14T10:00:00Z",
};

describe("TimesRequestParamsSchema", () => {
  it("parses valid params", () => {
    const result = TimesRequestParamsSchema.safeParse(validParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stationId).toBe("PAR_SOL");
    }
  });

  it("rejects empty stationId", () => {
    const result = TimesRequestParamsSchema.safeParse({
      ...validParams,
      stationId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing direction", () => {
    const { direction: _, ...withoutDirection } = validParams;
    const result = TimesRequestParamsSchema.safeParse(withoutDirection);
    expect(result.success).toBe(false);
  });
});

describe("RawTransportResponseSchema", () => {
  it("parses a valid CRTM response", () => {
    const result = RawTransportResponseSchema.safeParse(validRawResponse);
    expect(result.success).toBe(true);
  });

  it("rejects response with empty trains array", () => {
    const result = RawTransportResponseSchema.safeParse({
      ...validRawResponse,
      trains: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative eta_minutes", () => {
    const result = RawTransportResponseSchema.safeParse({
      ...validRawResponse,
      trains: [{ eta_minutes: -1, destination: "Valdecarros", platform: "Andén 1" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid datetime format for fetched_at_iso", () => {
    const result = RawTransportResponseSchema.safeParse({
      ...validRawResponse,
      fetched_at_iso: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("CRTMAPIError", () => {
  it("is an instance of Error with correct name and statusCode", () => {
    const err = new CRTMAPIError(503, "Service Unavailable");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CRTMAPIError");
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe("Service Unavailable");
  });
});

describe("CRTMTimeoutError", () => {
  it("is an instance of Error with correct name and timeoutMs", () => {
    const err = new CRTMTimeoutError(5000);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("CRTMTimeoutError");
    expect(err.timeoutMs).toBe(5000);
    expect(err.message).toContain("5000");
  });
});
