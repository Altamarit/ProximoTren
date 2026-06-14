"use client";

import React from "react";
import type { UIState } from "@/types/ui-state.types";

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
        <>
          {uiState.status === "cache" && uiState.data.cache_age_seconds !== null && (
            <StaleDataWarning ageSeconds={uiState.data.cache_age_seconds} />
          )}
          <NextTrainCard
            train={uiState.data.data.trains[0]}
          />
          <FollowingTrainsList trains={uiState.data.data.trains.slice(1)} />
          <ServiceStatusIndicator source={uiState.data.source} />
        </>
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
  return (
    <article data-testid="next-train-card" aria-label="Próximo tren">
      <div
        data-testid="eta-minutes"
        style={{ fontSize: "48px", fontWeight: "bold", color: "#1a1a1a", lineHeight: 1 }}
      >
        {train.eta_minutes}
        <span style={{ fontSize: "20px", marginLeft: "4px" }}>min</span>
      </div>
      <div data-testid="train-platform" style={{ fontSize: "16px", color: "#1a1a1a" }}>
        Andén {train.platform}
      </div>
      <div data-testid="train-destination" style={{ fontSize: "18px", color: "#1a1a1a" }}>
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
        <p data-testid="error-message" style={{ fontSize: "14px", color: "#555" }}>
          {errorContext.type === "CRTMTimeoutError"
            ? "El servicio de CRTM no responde. Inténtalo de nuevo."
            : "Error al conectar con el servicio."}
        </p>
      )}
    </div>
  );
}
