"use client";

import React from "react";
import type { UIState } from "@/types/ui-state.types";
import {
  COLOR_TEXT_PRIMARY,
  FONT_SIZE_ETA,
  FONT_SIZE_ETA_UNIT,
  FONT_SIZE_PLATFORM,
  FONT_SIZE_DESTINATION,
  FONT_SIZE_SMALL,
} from "@/lib/design-tokens";
import { logger } from "@/lib/logger";

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
// Non-Negotiable #3 (graceful degradation): prevents a render crash from
// unmounting the entire shell with a blank screen.

interface ErrorBoundaryState { hasError: boolean }

class TrainDataErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error("TrainDataErrorBoundary caught render error", {
      message: error.message,
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ── Sub-components forward declarations (implemented below) ───────────────────

export interface TimesShellProps {
  uiState: UIState;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function TimesShell({ uiState, onRefresh, isRefreshing }: TimesShellProps) {
  return (
    <section data-testid="times-shell" aria-live="polite" aria-busy={uiState.status === "loading"}>
      <ActionBar onRefresh={onRefresh} isRefreshing={isRefreshing} />

      {uiState.status === "idle" && (
        <p data-testid="idle-state">Selecciona estación, línea y dirección para ver los próximos trenes.</p>
      )}

      {uiState.status === "loading" && <LoadingSkeleton />}

      {(uiState.status === "live" || uiState.status === "cache") && uiState.data.data && (
        <TrainDataErrorBoundary fallback={<EmptyState errorContext={null} />}>
          {uiState.status === "cache" && uiState.data.cache_age_seconds !== null && (
            <StaleDataWarning ageSeconds={uiState.data.cache_age_seconds} />
          )}
          <NextTrainCard
            train={uiState.data.data.trains[0]}
          />
          <FollowingTrainsList trains={uiState.data.data.trains.slice(1)} />
          <ServiceStatusIndicator source={uiState.data.source} />
        </TrainDataErrorBoundary>
      )}

      {uiState.status === "empty" && (
        <EmptyState errorContext={uiState.errorContext} />
      )}
    </section>
  );
}

// ── ActionBar ─────────────────────────────────────────────────────────────────

function ActionBar({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  return (
    <div data-testid="action-bar">
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Actualizar tiempos"
        data-testid="refresh-button"
        style={{ minHeight: "44px", minWidth: "44px" }}
      >
        {isRefreshing ? "Actualizando..." : "Actualizar"}
      </button>
    </div>
  );
}

// ── LoadingSkeleton ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Cargando tiempos" data-testid="loading-skeleton">
      <span aria-hidden="true">⏳</span>
      <span>Cargando tiempos...</span>
    </div>
  );
}

// ── StaleDataWarning ──────────────────────────────────────────────────────────

function StaleDataWarning({ ageSeconds }: { ageSeconds: number }) {
  const minutes = Math.round(ageSeconds / 60);
  return (
    <div role="alert" data-testid="stale-data-warning">
      Datos desactualizados — última actualización hace {minutes > 0 ? `${minutes} min` : "unos segundos"}.
    </div>
  );
}

// ── NextTrainCard (E6-S2) ─────────────────────────────────────────────────────

interface TrainData {
  eta_minutes: number;
  destination: string;
  platform: string;
}

export function NextTrainCard({ train }: { train: TrainData }) {
  const etaDisplay = Math.floor(train.eta_minutes);
  return (
    <article data-testid="next-train-card" aria-label="Próximo tren">
      <div
        data-testid="eta-minutes"
        style={{ fontSize: FONT_SIZE_ETA, fontWeight: "bold", color: COLOR_TEXT_PRIMARY, lineHeight: 1 }}
      >
        {etaDisplay}
        <span style={{ fontSize: FONT_SIZE_ETA_UNIT, marginLeft: "4px" }}>min</span>
      </div>
      <div data-testid="train-platform" style={{ fontSize: FONT_SIZE_PLATFORM, color: COLOR_TEXT_PRIMARY }}>
        Andén {train.platform}
      </div>
      <div data-testid="train-destination" style={{ fontSize: FONT_SIZE_DESTINATION, color: COLOR_TEXT_PRIMARY }}>
        Dirección {train.destination}
      </div>
    </article>
  );
}

// ── FollowingTrainsList ───────────────────────────────────────────────────────

function FollowingTrainsList({ trains }: { trains: TrainData[] }) {
  if (trains.length === 0) return null;
  return (
    <ul data-testid="following-trains-list" aria-label="Siguientes trenes">
      {trains.map((train, i) => (
        <li key={i} data-testid={`following-train-${i}`}>
          {train.eta_minutes} min — Andén {train.platform} — {train.destination}
        </li>
      ))}
    </ul>
  );
}

// ── ServiceStatusIndicator ────────────────────────────────────────────────────

function ServiceStatusIndicator({ source }: { source: "live" | "cache" | "empty" }) {
  return (
    <div data-testid="service-status">
      {source === "live" ? "🟢 Datos en tiempo real" : "🟡 Datos en caché"}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ errorContext }: { errorContext: { message: string; type: string } | null }) {
  return (
    <div role="alert" data-testid="empty-state">
      <p>No se pudieron obtener los tiempos del tren.</p>
      {errorContext && (
        <p data-testid="error-message" style={{ fontSize: FONT_SIZE_SMALL, color: "#555" }}>
          {errorContext.type === "CRTMTimeoutError"
            ? "El servicio de CRTM no responde. Inténtalo de nuevo."
            : "Error al conectar con el servicio."}
        </p>
      )}
    </div>
  );
}
