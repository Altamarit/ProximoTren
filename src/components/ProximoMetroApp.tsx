"use client";

import React, { useState } from "react";
import { useContextSelector } from "@/hooks/useContextSelector";
import { useFavorites } from "@/hooks/useFavorites";
import { useTimesShell } from "@/hooks/useTimesShell";
import { StationSelector } from "@/components/StationSelector";
import { TimesShell } from "@/components/TimesShell";
import type { Line, Direction } from "@/lib/types/catalogue";
import { COLOR_TEXT_PRIMARY } from "@/lib/design-tokens";

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: "480px",
    margin: "0 auto",
    padding: "16px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: COLOR_TEXT_PRIMARY,
  } satisfies React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  } satisfies React.CSSProperties,
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
  } satisfies React.CSSProperties,
  backButton: {
    minHeight: "44px",
    minWidth: "44px",
    padding: "0 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "16px",
    color: COLOR_TEXT_PRIMARY,
  } satisfies React.CSSProperties,
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "16px",
  } satisfies React.CSSProperties,
  optionList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  } satisfies React.CSSProperties,
  optionButton: {
    minHeight: "52px",
    padding: "12px 16px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 500,
    color: COLOR_TEXT_PRIMARY,
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } satisfies React.CSSProperties,
  lineColorDot: (color: string): React.CSSProperties => ({
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: color,
    flexShrink: 0,
  }),
  contextBar: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "8px",
  } satisfies React.CSSProperties,
} as const;

// ── Main component ────────────────────────────────────────────────────────────

export function ProximoMetroApp() {
  const ctx = useContextSelector();
  const { favorites } = useFavorites();
  const { uiState, refresh, isRefreshing } = useTimesShell(ctx.selectedContext);
  const [step, setStep] = useState<"station" | "line" | "direction" | "times">("station");

  // ── Step: Station selector ─────────────────────────────────────────────────
  if (step === "station") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Próximo Metro</h1>
        </div>
        <StationSelector
          stations={ctx.catalogue?.stations ?? []}
          favorites={favorites}
          isLoading={ctx.isLoadingCatalogue}
          onStationSelect={(stationId) => {
            ctx.selectStation(stationId);
            setStep("line");
          }}
        />
      </div>
    );
  }

  // ── Step: Line selector ────────────────────────────────────────────────────
  if (step === "line") {
    const stationName =
      ctx.catalogue?.stations.find((s) => s.station_id === ctx.selectedStationId)?.name ?? ctx.selectedStationId;

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => { ctx.reset(); setStep("station"); }}
            aria-label="Volver a selección de estación"
          >
            ←
          </button>
          <h1 style={styles.title}>{stationName}</h1>
        </div>
        <p style={styles.sectionTitle}>Elige línea</p>
        <div style={styles.optionList}>
          {ctx.availableLines.map((line: Line) => (
            <button
              key={line.line_id}
              style={styles.optionButton}
              onClick={() => { ctx.selectLine(line.line_id); setStep("direction"); }}
            >
              <span style={styles.lineColorDot(line.color_hex)} aria-hidden="true" />
              {line.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Direction selector ───────────────────────────────────────────────
  if (step === "direction") {
    const lineName =
      ctx.catalogue?.lines.find((l) => l.line_id === ctx.selectedLineId)?.name ?? ctx.selectedLineId;

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => setStep("line")}
            aria-label="Volver a selección de línea"
          >
            ←
          </button>
          <h1 style={styles.title}>{lineName}</h1>
        </div>
        <p style={styles.sectionTitle}>Elige dirección</p>
        <div style={styles.optionList}>
          {ctx.availableDirections.map((dir: Direction) => (
            <button
              key={dir.direction_id}
              style={styles.optionButton}
              onClick={() => { ctx.selectDirection(dir.terminal_name); setStep("times"); }}
            >
              → {dir.terminal_name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Times ────────────────────────────────────────────────────────────
  const stationName =
    ctx.catalogue?.stations.find((s) => s.station_id === ctx.selectedStationId)?.name ?? ctx.selectedStationId;
  const lineName =
    ctx.catalogue?.lines.find((l) => l.line_id === ctx.selectedLineId)?.name ?? ctx.selectedLineId;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => { ctx.reset(); setStep("station"); }}
          aria-label="Volver a selección de estación"
        >
          ←
        </button>
        <div>
          <h1 style={styles.title}>{stationName}</h1>
          <p style={styles.contextBar}>{lineName} · {ctx.selectedDirection}</p>
        </div>
      </div>
      <TimesShell uiState={uiState} onRefresh={refresh} isRefreshing={isRefreshing} />
    </div>
  );
}
