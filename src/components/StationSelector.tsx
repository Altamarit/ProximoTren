"use client";

import React, { useState, useCallback, useId, useMemo } from "react";
import type { Station } from "@/lib/types/catalogue";
import type { FavoriteEntry } from "@/types/context.types";

// ── Text normalization ────────────────────────────────────────────────────────
// Strips accents so "Moncloa" matches "moncloa", "ó" matches "o", etc.

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface StationSelectorProps {
  stations: Station[];
  favorites: FavoriteEntry[];
  isLoading: boolean;
  onStationSelect: (stationId: string) => void;
  onClose?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StationSelector({
  stations,
  favorites,
  isLoading,
  onStationSelect,
  onClose,
}: StationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchId = useId();
  const listId = useId();

  const favoriteIds = new Set(favorites.map((f) => f.stationId));

  // ── Derived lists ─────────────────────────────────────────────────────────
  const normalizedQuery = normalizeText(searchQuery);

  const orderedStations = useMemo(() => {
    const filtered =
      normalizedQuery.length > 0
        ? stations.filter((s) => normalizeText(s.name).includes(normalizedQuery))
        : stations;
    const favs = filtered.filter((s) => favoriteIds.has(s.station_id));
    const others = filtered.filter((s) => !favoriteIds.has(s.station_id));
    return { favoriteStations: favs, otherStations: others, all: [...favs, ...others] };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, normalizedQuery, favorites]);

  // ── Keyboard handler on container ─────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, orderedStations.all.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < orderedStations.all.length) {
            onStationSelect(orderedStations.all[focusedIndex].station_id);
          }
          break;
        case "Escape":
          onClose?.();
          break;
      }
    },
    [focusedIndex, orderedStations, onStationSelect, onClose]
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div role="status" aria-label="Cargando estaciones" data-testid="station-selector-loading">
        <span aria-hidden="true">⏳</span>
        <span>Cargando estaciones...</span>
      </div>
    );
  }

  // ── Item style — meets AC-6 (min-height 44px) and AC-7 (contrast ≥ 4.5:1)
  // #1a1a1a on #ffffff = contrast ratio 16.1:1
  const itemStyle: React.CSSProperties = {
    minHeight: "44px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    cursor: "pointer",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    border: "none",
    textAlign: "left",
    boxSizing: "border-box",
  };

  return (
    <div onKeyDown={handleKeyDown} data-testid="station-selector">
      <label htmlFor={searchId}>Buscar estación</label>
      <input
        id={searchId}
        type="search"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setFocusedIndex(-1);
        }}
        placeholder="Buscar estación..."
        aria-label="Buscar estación"
        aria-controls={listId}
        aria-autocomplete="list"
      />

      {orderedStations.all.length === 0 ? (
        <p role="status" data-testid="no-results">
          {searchQuery.trim().length > 0
            ? `No se encontraron estaciones para "${searchQuery}"`
            : "No hay estaciones disponibles"}
        </p>
      ) : (
        <ul
          id={listId}
          role="listbox"
          aria-label="Estaciones"
          data-testid="station-list"
          style={{ listStyle: "none", padding: 0, margin: 0, overflowY: "auto" }}
        >
          {orderedStations.favoriteStations.length > 0 && (
            <li role="presentation" aria-hidden="true" data-testid="favorites-label">
              Favoritas
            </li>
          )}

          {orderedStations.favoriteStations.map((station, idx) => (
            <li
              key={station.station_id}
              role="option"
              aria-selected={idx === focusedIndex}
              tabIndex={0}
              style={itemStyle}
              data-testid={`station-item-${station.station_id}`}
              data-station-id={station.station_id}
              data-favorite="true"
              onClick={() => onStationSelect(station.station_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onStationSelect(station.station_id);
              }}
            >
              {station.name}
            </li>
          ))}

          {orderedStations.favoriteStations.length > 0 && orderedStations.otherStations.length > 0 && (
            <li role="separator" aria-hidden="true" data-testid="favorites-separator" />
          )}

          {orderedStations.otherStations.map((station, idx) => {
            const absoluteIdx = orderedStations.favoriteStations.length + idx;
            return (
              <li
                key={station.station_id}
                role="option"
                aria-selected={absoluteIdx === focusedIndex}
                tabIndex={0}
                style={itemStyle}
                data-testid={`station-item-${station.station_id}`}
                data-station-id={station.station_id}
                onClick={() => onStationSelect(station.station_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onStationSelect(station.station_id);
                }}
              >
                {station.name}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
