import { describe, it, expect } from "vitest";
import { StationSchema, LineSchema, DirectionSchema, CatalogueSchema } from "@/lib/types/catalogue";
import stationsRaw from "../../public/data/stations.json";
import linesRaw from "../../public/data/lines.json";
import directionsRaw from "../../public/data/directions.json";

describe("E2-S2 — JSON catalogue integrity", () => {
  const lines = linesRaw.map((l) => LineSchema.parse(l));
  const stations = stationsRaw.map((s) => StationSchema.parse(s));
  const directions = directionsRaw.map((d) => DirectionSchema.parse(d));
  const lineIds = new Set(lines.map((l) => l.line_id));

  it("CatalogueSchema validates the full catalogue", () => {
    const result = CatalogueSchema.safeParse({
      stations,
      lines,
      directions,
    });
    expect(result.success).toBe(true);
  });

  it("has 13 lines", () => {
    expect(lines).toHaveLength(13);
  });

  it("has 26 directions — exactly 2 per line", () => {
    expect(directions).toHaveLength(26);
    for (const line of lines) {
      const lineDirs = directions.filter((d) => d.line_id === line.line_id);
      expect(lineDirs, `Line ${line.line_id} must have exactly 2 directions`).toHaveLength(2);
    }
  });

  it("has at least 85 stations", () => {
    expect(stations.length).toBeGreaterThanOrEqual(85);
  });

  it("all station_ids are unique", () => {
    const ids = stations.map((s) => s.station_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all line_ids referenced in stations exist in lines", () => {
    for (const station of stations) {
      for (const lineId of station.line_ids) {
        expect(lineIds, `station ${station.station_id} references unknown line ${lineId}`).toContain(lineId);
      }
    }
  });

  it("all direction line_ids reference existing lines", () => {
    for (const dir of directions) {
      expect(lineIds, `direction ${dir.direction_id} references unknown line ${dir.line_id}`).toContain(dir.line_id);
    }
  });

  it("all stations have coordinates within greater Madrid Metro area", () => {
    for (const s of stations) {
      expect(s.lat, `${s.station_id} lat out of range`).toBeGreaterThanOrEqual(40.25);
      expect(s.lat, `${s.station_id} lat out of range`).toBeLessThanOrEqual(40.60);
      expect(s.lon, `${s.station_id} lon out of range`).toBeGreaterThanOrEqual(-3.90);
      expect(s.lon, `${s.station_id} lon out of range`).toBeLessThanOrEqual(-3.45);
    }
  });

  it("all line color_hex values match #RRGGBB format", () => {
    for (const line of lines) {
      expect(line.color_hex, `${line.line_id} color_hex invalid`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("each line has at least 2 stations assigned", () => {
    for (const line of lines) {
      const lineStations = stations.filter((s) => s.line_ids.includes(line.line_id));
      expect(lineStations.length, `Line ${line.line_id} has no stations`).toBeGreaterThanOrEqual(2);
    }
  });
});
