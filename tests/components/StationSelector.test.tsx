import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StationSelector } from "@/components/StationSelector";
import type { Station } from "@/lib/types/catalogue";
import type { FavoriteEntry } from "@/types/context.types";

const stations: Station[] = [
  { station_id: "PAR_SOL",       name: "Sol",            line_ids: ["L1"], lat: 40.41, lon: -3.70 },
  { station_id: "PAR_BILBAO",    name: "Bilbao",         line_ids: ["L1"], lat: 40.42, lon: -3.70 },
  { station_id: "PAR_MONCLOA",   name: "Moncloa",        line_ids: ["L3"], lat: 40.43, lon: -3.71 },
  { station_id: "PAR_ARGUELLES", name: "Argüelles",      line_ids: ["L3"], lat: 40.42, lon: -3.71 },
  { station_id: "PAR_RETIRO",    name: "Retiro",         line_ids: ["L2"], lat: 40.41, lon: -3.68 },
];

const noFavorites: FavoriteEntry[] = [];

const withFavorites: FavoriteEntry[] = [
  { stationId: "PAR_BILBAO", lineId: "L1", direction: "Valdecarros", addedAt: "2026-06-14T10:00:00Z" },
];

const onStationSelect = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StationSelector", () => {
  describe("AC-1 — Favorites appear first", () => {
    it("renders favorites section label when there are favorites", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={withFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      expect(screen.getByTestId("favorites-label")).toBeDefined();
    });

    it("favorite station appears before non-favorite stations in the list", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={withFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      const items = screen.getAllByRole("option");
      expect(items[0].dataset.stationId).toBe("PAR_BILBAO");
    });

    it("does not render favorites label when no favorites", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      expect(screen.queryByTestId("favorites-label")).toBeNull();
    });
  });

  describe("AC-2 — Full station list", () => {
    it("renders all stations without filter", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      const items = screen.getAllByRole("option");
      expect(items).toHaveLength(stations.length);
    });
  });

  describe("AC-3 — Search filter", () => {
    it("filters list when user types in search box", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      const input = screen.getByRole("searchbox");
      fireEvent.change(input, { target: { value: "Sol" } });
      const items = screen.getAllByRole("option");
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toBe("Sol");
    });

    it("filter is accent-insensitive — 'Arguelles' matches 'Argüelles'", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      const input = screen.getByRole("searchbox");
      fireEvent.change(input, { target: { value: "Arguelles" } });
      const items = screen.getAllByRole("option");
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toBe("Argüelles");
    });

    it("filter is case-insensitive", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      const input = screen.getByRole("searchbox");
      fireEvent.change(input, { target: { value: "retiro" } });
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });

    it("favorites matching the filter appear first in filtered results", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={withFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      const input = screen.getByRole("searchbox");
      fireEvent.change(input, { target: { value: "b" } }); // matches "Bilbao"
      const items = screen.getAllByRole("option");
      expect(items[0].dataset.stationId).toBe("PAR_BILBAO");
      expect(items[0].dataset.favorite).toBe("true");
    });

    it("shows no-results message when search yields nothing", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "XXXXXX" } });
      expect(screen.getByTestId("no-results")).toBeDefined();
      expect(screen.queryByRole("option")).toBeNull();
    });
  });

  describe("AC-4 — onStationSelect callback", () => {
    it("calls onStationSelect with the correct stationId on click", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      fireEvent.click(screen.getByTestId("station-item-PAR_SOL"));
      expect(onStationSelect).toHaveBeenCalledWith("PAR_SOL");
    });

    it("calls onStationSelect on Enter keydown on item", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      fireEvent.keyDown(screen.getByTestId("station-item-PAR_MONCLOA"), { key: "Enter" });
      expect(onStationSelect).toHaveBeenCalledWith("PAR_MONCLOA");
    });
  });

  describe("AC-5 — Loading state", () => {
    it("shows loading indicator when isLoading is true", () => {
      render(
        <StationSelector
          stations={[]}
          favorites={noFavorites}
          isLoading={true}
          onStationSelect={onStationSelect}
        />
      );
      expect(screen.getByTestId("station-selector-loading")).toBeDefined();
      expect(screen.queryByRole("option")).toBeNull();
    });

    it("does not render the list when loading", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={true}
          onStationSelect={onStationSelect}
        />
      );
      expect(screen.queryByRole("listbox")).toBeNull();
    });
  });

  describe("AC-6 — Touch target min-height 44px", () => {
    it("each station item has minHeight of 44px", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      const items = screen.getAllByRole("option");
      for (const item of items) {
        expect((item as HTMLElement).style.minHeight).toBe("44px");
      }
    });
  });

  describe("AC-8 — Keyboard navigation", () => {
    it("Escape key calls onClose", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
          onClose={onClose}
        />
      );
      fireEvent.keyDown(screen.getByTestId("station-selector"), { key: "Escape" });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not crash when Escape pressed without onClose prop", () => {
      render(
        <StationSelector
          stations={stations}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      expect(() =>
        fireEvent.keyDown(screen.getByTestId("station-selector"), { key: "Escape" })
      ).not.toThrow();
    });
  });

  describe("Edge cases", () => {
    it("shows empty-state message when stations array is empty", () => {
      render(
        <StationSelector
          stations={[]}
          favorites={noFavorites}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      expect(screen.getByTestId("no-results")).toBeDefined();
    });

    it("omits inconsistent favorites (station not in catalogue)", () => {
      const staleFavorite: FavoriteEntry[] = [
        { stationId: "PAR_DELETED", lineId: "L1", direction: "X", addedAt: "2026-06-14T10:00:00Z" },
      ];
      render(
        <StationSelector
          stations={stations}
          favorites={staleFavorite}
          isLoading={false}
          onStationSelect={onStationSelect}
        />
      );
      // No favorites label since the favorited station isn't in the catalogue list
      expect(screen.queryByTestId("favorites-label")).toBeNull();
    });
  });
});
