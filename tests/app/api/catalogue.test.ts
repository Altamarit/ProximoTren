import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/catalogue/route";

describe("GET /api/catalogue", () => {
  it("returns 200 with a valid catalogue payload", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("response body contains stations, lines and directions arrays", async () => {
    const response = await GET();
    const body = (await response.json()) as {
      stations: unknown[];
      lines: unknown[];
      directions: unknown[];
    };
    expect(Array.isArray(body.stations)).toBe(true);
    expect(Array.isArray(body.lines)).toBe(true);
    expect(Array.isArray(body.directions)).toBe(true);
  });

  it("has at least 85 stations", async () => {
    const response = await GET();
    const body = (await response.json()) as { stations: unknown[] };
    expect(body.stations.length).toBeGreaterThanOrEqual(85);
  });

  it("has exactly 13 lines", async () => {
    const response = await GET();
    const body = (await response.json()) as { lines: unknown[] };
    expect(body.lines).toHaveLength(13);
  });

  it("has exactly 26 directions", async () => {
    const response = await GET();
    const body = (await response.json()) as { directions: unknown[] };
    expect(body.directions).toHaveLength(26);
  });
});
