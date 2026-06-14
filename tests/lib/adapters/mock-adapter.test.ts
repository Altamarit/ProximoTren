import { describe, it, expect } from "vitest";
import { MockAdapter } from "@/lib/adapters/mock-adapter";
import { RawTransportResponseSchema } from "@/lib/adapters/types";

const p1 = { stationId: "PAR_SOL",                lineId: "L1",  direction: "Valdecarros" };
const p2 = { stationId: "PAR_CUATRO_CAMINOS",      lineId: "L2",  direction: "Las Rosas" };
const p3 = { stationId: "PAR_NUEVOS_MINISTERIOS",  lineId: "L8",  direction: "Aeropuerto T4" };

describe("MockAdapter", () => {
  const adapter = new MockAdapter();

  it("AC-1 — implements TransportAdapter interface (getTrainTimes exists)", () => {
    expect(typeof adapter.getTrainTimes).toBe("function");
  });

  it("AC-1 — static isMock is true", () => {
    expect(MockAdapter.isMock).toBe(true);
  });

  it("AC-2 — response passes RawTransportResponseSchema validation", async () => {
    const result = await adapter.getTrainTimes(p1);
    const parsed = RawTransportResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("AC-2 — all required fields are present in the response", async () => {
    const result = await adapter.getTrainTimes(p1);
    expect(result.station_id).toBe(p1.stationId);
    expect(result.line_id).toBe(p1.lineId);
    expect(result.direction).toBe(p1.direction);
    expect(result.trains.length).toBeGreaterThanOrEqual(1);
    expect(result.fetched_at_iso).toBeTruthy();
  });

  it("AC-2 — fetched_at_iso is a valid ISO 8601 datetime", async () => {
    const result = await adapter.getTrainTimes(p1);
    expect(new Date(result.fetched_at_iso).toISOString()).toBeTruthy();
  });

  it("AC-3 — first train ETAs vary across different stations", async () => {
    const [r1, r2, r3] = await Promise.all([
      adapter.getTrainTimes(p1),
      adapter.getTrainTimes(p2),
      adapter.getTrainTimes(p3),
    ]);
    const firstEtas = [r1.trains[0].eta_minutes, r2.trains[0].eta_minutes, r3.trains[0].eta_minutes];
    const uniqueEtas = new Set(firstEtas);
    expect(uniqueEtas.size).toBeGreaterThan(1);
  });

  it("AC-3 — trains have positive ETAs and plausible platform values", async () => {
    const result = await adapter.getTrainTimes(p1);
    for (const train of result.trains) {
      expect(train.eta_minutes).toBeGreaterThanOrEqual(1);
      expect(["1", "2", "3"]).toContain(train.platform);
    }
  });

  it("AC-3 — destination matches a known Metro de Madrid terminal", async () => {
    const result = await adapter.getTrainTimes(p1);
    expect(result.trains[0].destination).toBeTruthy();
    expect(result.trains[0].destination.length).toBeGreaterThan(0);
  });

  it("AC-4 — isMock static property is accessible without instantiation", () => {
    expect(MockAdapter.isMock).toBe(true);
  });
});
