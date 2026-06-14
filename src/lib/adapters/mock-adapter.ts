import type { TransportAdapter, TimesRequestParams, RawTransportResponse } from "@/lib/adapters/types";

// Synthetic train data per station hash — visually indistinguishable from live data.
const TERMINALS: Record<string, string> = {
  L1: "Valdecarros",
  L2: "Las Rosas",
  L3: "Villaverde Alto",
  L4: "Pinar de Chamartín",
  L5: "Casa de Campo",
  L6: "Sentido Horario",
  L7: "Hospital del Henares",
  L8: "Aeropuerto T4",
  L9: "Arganda del Rey",
  L10: "Puerta del Sur",
  L11: "La Fortuna",
  L12: "Puerta del Sur",
  ML1: "Las Tablas",
};

function hashStation(stationId: string): number {
  return stationId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export class MockAdapter implements TransportAdapter {
  static readonly isMock = true as const;

  async getTrainTimes(params: TimesRequestParams): Promise<RawTransportResponse> {
    const hash = hashStation(params.stationId);
    const base = (hash % 4) + 1; // 1–4 min first train
    const gap = (hash % 3) + 2; // 2–4 min between trains
    const destination = TERMINALS[params.lineId] ?? params.direction;
    const platform = ((hash % 3) + 1).toString();

    return {
      station_id: params.stationId,
      line_id: params.lineId,
      direction: params.direction,
      trains: [
        { eta_minutes: base, destination, platform },
        { eta_minutes: base + gap, destination, platform },
        { eta_minutes: base + gap * 2, destination, platform },
      ],
      fetched_at_iso: new Date().toISOString(),
    };
  }
}
