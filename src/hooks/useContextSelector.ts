"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Catalogue, Station, Line, Direction } from "@/lib/types/catalogue";
import type { SelectedContext } from "@/types/context.types";

// ── State ─────────────────────────────────────────────────────────────────────

export interface ContextSelectorState {
  isLoadingCatalogue: boolean;
  catalogue: Catalogue | null;
  // Available options derived from the current selection
  availableLines: Line[];
  availableDirections: Direction[];
  // Current selection
  selectedStationId: string | null;
  selectedLineId: string | null;
  selectedDirection: string | null;
  // Computed
  selectedContext: SelectedContext | null;
  // Actions
  selectStation: (stationId: string) => void;
  selectLine: (lineId: string) => void;
  selectDirection: (direction: string) => void;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useContextSelector(): ContextSelectorState {
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(true);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);

  // ── Load catalogue on mount ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/catalogue");
        if (!res.ok) throw new Error(`Catalogue fetch failed: ${res.status}`);
        const data = (await res.json()) as Catalogue;
        if (!cancelled) {
          setCatalogue(data);
          setIsLoadingCatalogue(false);
        }
      } catch {
        if (!cancelled) setIsLoadingCatalogue(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived — availableLines ──────────────────────────────────────────────
  const availableLines: Line[] = (() => {
    if (!catalogue || !selectedStationId) return [];
    const station = catalogue.stations.find((s: Station) => s.station_id === selectedStationId);
    if (!station) return [];
    return catalogue.lines.filter((l: Line) => station.line_ids.includes(l.line_id));
  })();

  // ── Derived — availableDirections ─────────────────────────────────────────
  const availableDirections: Direction[] = (() => {
    if (!catalogue || !selectedLineId) return [];
    return catalogue.directions.filter((d: Direction) => d.line_id === selectedLineId);
  })();

  // ── Derived — selectedContext ─────────────────────────────────────────────
  // useMemo stabilizes the object reference — without it, a new object on every
  // render would cause useTimesShell's useEffect to fire in an infinite loop.
  const selectedContext: SelectedContext | null = useMemo(
    () =>
      selectedStationId && selectedLineId && selectedDirection
        ? { stationId: selectedStationId, lineId: selectedLineId, direction: selectedDirection }
        : null,
    [selectedStationId, selectedLineId, selectedDirection]
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const selectStation = useCallback((stationId: string) => {
    setSelectedStationId(stationId);
    setSelectedLineId(null);
    setSelectedDirection(null);
  }, []);

  const selectLine = useCallback((lineId: string) => {
    setSelectedLineId(lineId);
    setSelectedDirection(null);
  }, []);

  const selectDirection = useCallback((direction: string) => {
    setSelectedDirection(direction);
  }, []);

  const reset = useCallback(() => {
    setSelectedStationId(null);
    setSelectedLineId(null);
    setSelectedDirection(null);
  }, []);

  return {
    isLoadingCatalogue,
    catalogue,
    availableLines,
    availableDirections,
    selectedStationId,
    selectedLineId,
    selectedDirection,
    selectedContext,
    selectStation,
    selectLine,
    selectDirection,
    reset,
  };
}
