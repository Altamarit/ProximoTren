import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useContextSelector } from "@/hooks/useContextSelector";
import type { Catalogue } from "@/lib/types/catalogue";

const mockCatalogue: Catalogue = {
  stations: [
    { station_id: "PAR_SOL",          name: "Sol",          line_ids: ["L1", "L2"], lat: 40.4168, lon: -3.7038 },
    { station_id: "PAR_CUATRO",       name: "Cuatro Caminos", line_ids: ["L1"],      lat: 40.4453, lon: -3.7033 },
    { station_id: "PAR_BILBAO",       name: "Bilbao",        line_ids: ["L1", "L4"], lat: 40.4282, lon: -3.7025 },
  ],
  lines: [
    { line_id: "L1", name: "Línea 1", color_hex: "#009FE3", terminal_stations: ["Pinar de Chamartín", "Valdecarros"] },
    { line_id: "L2", name: "Línea 2", color_hex: "#E30613", terminal_stations: ["Cuatro Caminos", "Las Rosas"] },
    { line_id: "L4", name: "Línea 4", color_hex: "#9D4F15", terminal_stations: ["Argüelles", "Pinar de Chamartín"] },
  ],
  directions: [
    { direction_id: "L1_VAL",  line_id: "L1", terminal_name: "Valdecarros" },
    { direction_id: "L1_PCH",  line_id: "L1", terminal_name: "Pinar de Chamartín" },
    { direction_id: "L2_LAS",  line_id: "L2", terminal_name: "Las Rosas" },
    { direction_id: "L2_CUA",  line_id: "L2", terminal_name: "Cuatro Caminos" },
    { direction_id: "L4_PCH",  line_id: "L4", terminal_name: "Pinar de Chamartín" },
    { direction_id: "L4_ARG",  line_id: "L4", terminal_name: "Argüelles" },
  ],
};

function mockFetchSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalogue,
    })
  );
}

function mockFetchFailure() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, status: 500 })
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useContextSelector", () => {
  describe("AC-1 — Catalogue loading", () => {
    it("starts with isLoadingCatalogue: true", () => {
      vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
      const { result } = renderHook(() => useContextSelector());
      expect(result.current.isLoadingCatalogue).toBe(true);
      expect(result.current.catalogue).toBeNull();
    });

    it("sets isLoadingCatalogue: false and populates catalogue after fetch", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));
      expect(result.current.catalogue).not.toBeNull();
      expect(result.current.catalogue?.lines).toHaveLength(3);
    });

    it("sets isLoadingCatalogue: false even when fetch fails", async () => {
      mockFetchFailure();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));
      expect(result.current.catalogue).toBeNull();
    });
  });

  describe("AC-2 — selectStation: availableLines derived from station", () => {
    it("availableLines contains only lines for the selected station", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));

      // PAR_SOL has L1 and L2
      expect(result.current.availableLines.map((l) => l.line_id).sort()).toEqual(["L1", "L2"]);
    });

    it("resets selectedLineId and selectedDirection when station changes", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));
      act(() => result.current.selectLine("L1"));
      act(() => result.current.selectDirection("Valdecarros"));
      act(() => result.current.selectStation("PAR_BILBAO"));

      expect(result.current.selectedLineId).toBeNull();
      expect(result.current.selectedDirection).toBeNull();
    });

    it("availableDirections is empty after selecting a new station", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));
      act(() => result.current.selectLine("L1"));
      act(() => result.current.selectStation("PAR_BILBAO")); // change station

      expect(result.current.availableDirections).toHaveLength(0);
    });
  });

  describe("AC-3 — selectLine: availableDirections for station/line combo", () => {
    it("availableDirections contains directions for the selected line", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));
      act(() => result.current.selectLine("L1"));

      expect(result.current.availableDirections.map((d) => d.direction_id).sort()).toEqual([
        "L1_PCH",
        "L1_VAL",
      ]);
    });

    it("resets selectedDirection when line changes", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));
      act(() => result.current.selectLine("L1"));
      act(() => result.current.selectDirection("Valdecarros"));
      act(() => result.current.selectLine("L2"));

      expect(result.current.selectedDirection).toBeNull();
    });
  });

  describe("AC-4 — selectedContext when all three fields are set", () => {
    it("selectedContext is non-null when station, line, direction are all selected", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));
      act(() => result.current.selectLine("L1"));
      act(() => result.current.selectDirection("Valdecarros"));

      expect(result.current.selectedContext).toEqual({
        stationId: "PAR_SOL",
        lineId: "L1",
        direction: "Valdecarros",
      });
    });

    it("selectedContext is null when direction is missing", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));
      act(() => result.current.selectLine("L1"));

      expect(result.current.selectedContext).toBeNull();
    });
  });

  describe("reset()", () => {
    it("clears all selections", async () => {
      mockFetchSuccess();
      const { result } = renderHook(() => useContextSelector());
      await waitFor(() => expect(result.current.isLoadingCatalogue).toBe(false));

      act(() => result.current.selectStation("PAR_SOL"));
      act(() => result.current.selectLine("L1"));
      act(() => result.current.selectDirection("Valdecarros"));
      act(() => result.current.reset());

      expect(result.current.selectedStationId).toBeNull();
      expect(result.current.selectedLineId).toBeNull();
      expect(result.current.selectedDirection).toBeNull();
      expect(result.current.selectedContext).toBeNull();
    });
  });
});
