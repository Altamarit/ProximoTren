import { describe, it, expect } from "vitest";
import { SelectedContextSchema, FavoriteEntrySchema } from "@/types/context.types";

describe("SelectedContextSchema", () => {
  it("AC-2 — parses a valid SelectedContext", () => {
    const result = SelectedContextSchema.safeParse({
      stationId: "PAR_SOL",
      lineId: "L1",
      direction: "Valdecarros",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stationId).toBe("PAR_SOL");
      expect(result.data.lineId).toBe("L1");
      expect(result.data.direction).toBe("Valdecarros");
    }
  });

  it("AC-3 — rejects empty stationId", () => {
    const result = SelectedContextSchema.safeParse({
      stationId: "",
      lineId: "L1",
      direction: "Valdecarros",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("stationId"))).toBe(true);
    }
  });

  it("AC-3 — rejects missing lineId", () => {
    const result = SelectedContextSchema.safeParse({
      stationId: "PAR_SOL",
      direction: "Valdecarros",
    });
    expect(result.success).toBe(false);
  });

  it("AC-3 — rejects empty direction", () => {
    const result = SelectedContextSchema.safeParse({
      stationId: "PAR_SOL",
      lineId: "L1",
      direction: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("FavoriteEntrySchema", () => {
  const validEntry = {
    stationId: "PAR_SOL",
    lineId: "L1",
    direction: "Valdecarros",
    addedAt: "2026-06-14T10:00:00Z",
  };

  it("AC-4 — parses a valid FavoriteEntry with ISO timestamp", () => {
    const result = FavoriteEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.addedAt).toBe("2026-06-14T10:00:00Z");
    }
  });

  it("AC-4 — rejects invalid addedAt datetime", () => {
    const result = FavoriteEntrySchema.safeParse({
      ...validEntry,
      addedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("AC-4 — rejects missing addedAt field", () => {
    const { addedAt: _, ...withoutAddedAt } = validEntry;
    const result = FavoriteEntrySchema.safeParse(withoutAddedAt);
    expect(result.success).toBe(false);
  });

  it("AC-1 — SelectedContext and FavoriteEntry types are used without TS errors", () => {
    // This test verifies that imports work and types are usable — tsc --noEmit covers the rest
    const ctx = SelectedContextSchema.parse({ stationId: "PAR_SOL", lineId: "L1", direction: "Valdecarros" });
    const fav = FavoriteEntrySchema.parse(validEntry);
    expect(ctx.stationId).toBe(fav.stationId);
  });
});
