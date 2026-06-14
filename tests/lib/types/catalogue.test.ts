import { describe, it, expect } from "vitest";
import {
  StationSchema,
  LineSchema,
  DirectionSchema,
  CatalogueSchema,
} from "@/lib/types/catalogue";

const validStation = {
  station_id: "PAR_SOL",
  name: "Sol",
  line_ids: ["L1", "L2", "L3"],
  lat: 40.4168,
  lon: -3.7038,
};

const validLine = {
  line_id: "L1",
  name: "Línea 1",
  color_hex: "#009FE3",
  terminal_stations: ["Pinar de Chamartín", "Valdecarros"],
};

const validDirection = {
  direction_id: "L1-VALDECARROS",
  line_id: "L1",
  terminal_name: "Valdecarros",
};

describe("StationSchema", () => {
  it("parses a valid station", () => {
    const result = StationSchema.parse(validStation);
    expect(result.station_id).toBe("PAR_SOL");
    expect(result.line_ids).toHaveLength(3);
  });

  it("rejects empty station_id", () => {
    expect(() =>
      StationSchema.parse({ ...validStation, station_id: "" })
    ).toThrow();
  });

  it("rejects empty line_ids array", () => {
    expect(() =>
      StationSchema.parse({ ...validStation, line_ids: [] })
    ).toThrow();
  });

  it("rejects lat out of range", () => {
    expect(() =>
      StationSchema.parse({ ...validStation, lat: 91 })
    ).toThrow();
  });

  it("rejects lon out of range", () => {
    expect(() =>
      StationSchema.parse({ ...validStation, lon: -181 })
    ).toThrow();
  });
});

describe("LineSchema", () => {
  it("parses a valid line", () => {
    const result = LineSchema.parse(validLine);
    expect(result.line_id).toBe("L1");
    expect(result.color_hex).toBe("#009FE3");
  });

  it("rejects invalid color_hex format", () => {
    expect(() =>
      LineSchema.parse({ ...validLine, color_hex: "009FE3" })
    ).toThrow();
  });

  it("rejects color_hex with wrong length", () => {
    expect(() =>
      LineSchema.parse({ ...validLine, color_hex: "#GGG" })
    ).toThrow();
  });

  it("rejects terminal_stations with != 2 entries", () => {
    expect(() =>
      LineSchema.parse({ ...validLine, terminal_stations: ["Solo uno"] })
    ).toThrow();
  });
});

describe("DirectionSchema", () => {
  it("parses a valid direction", () => {
    const result = DirectionSchema.parse(validDirection);
    expect(result.direction_id).toBe("L1-VALDECARROS");
    expect(result.line_id).toBe("L1");
  });

  it("rejects empty terminal_name", () => {
    expect(() =>
      DirectionSchema.parse({ ...validDirection, terminal_name: "" })
    ).toThrow();
  });
});

describe("CatalogueSchema", () => {
  it("parses a valid catalogue", () => {
    const result = CatalogueSchema.parse({
      stations: [validStation],
      lines: [validLine],
      directions: [validDirection],
    });
    expect(result.stations).toHaveLength(1);
    expect(result.lines).toHaveLength(1);
    expect(result.directions).toHaveLength(1);
  });

  it("rejects empty stations array", () => {
    expect(() =>
      CatalogueSchema.parse({
        stations: [],
        lines: [validLine],
        directions: [validDirection],
      })
    ).toThrow();
  });
});
