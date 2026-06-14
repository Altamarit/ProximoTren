"use client";

import React, { useState, useEffect } from "react";
import { useContextSelector } from "@/hooks/useContextSelector";
import { useFavorites } from "@/hooks/useFavorites";
import { useTimesShell } from "@/hooks/useTimesShell";
import type { Line } from "@/lib/types/catalogue";

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return { theme, toggle };
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MetroIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16.5L8 7.5L12 16.5L16 7.5L20 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProximoMetroApp() {
  const { theme, toggle: toggleTheme } = useTheme();
  const ctx = useContextSelector();
  const { favorites } = useFavorites();
  const { uiState, refresh, isRefreshing } = useTimesShell(ctx.selectedContext);

  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const selectedLine = ctx.catalogue?.lines.find((l) => l.line_id === ctx.selectedLineId);

  const renderContent = () => {
    if (!ctx.selectedContext) {
      return (
        <div className="pm-hero-card">
          <div className="pm-idle-hint">
            Selecciona estación, línea y dirección para ver los próximos trenes
          </div>
        </div>
      );
    }

    if (uiState.status === "loading") {
      return (
        <div className="pm-hero-card">
          <div className="pm-skeleton pm-skeleton-hero" aria-busy="true" aria-label="Cargando tiempos" />
        </div>
      );
    }

    if (uiState.status === "live" || uiState.status === "cache") {
      const trains = uiState.data.data?.trains ?? [];
      const first = trains[0];
      const rest = trains.slice(1);
      const updatedAt = new Date(uiState.data.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

      return (
        <>
          {uiState.status === "cache" && (
            <div className="pm-status-card" style={{ background: "rgba(180,83,9,0.08)", borderColor: "rgba(180,83,9,0.2)" }}>
              <div>
                <div className="pm-label">Aviso</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-warning)" }}>
                  Datos en caché — sin conexión con CRTM
                </div>
              </div>
            </div>
          )}

          {first && (
            <section className="pm-hero-card" aria-labelledby="pm-hero-title">
              <div className="pm-hero-top">
                <p className="pm-hero-title" id="pm-hero-title">Próximo tren</p>
                {selectedLine && (
                  <span
                    className="pm-hero-badge"
                    style={{ background: selectedLine.color_hex + "22", color: selectedLine.color_hex }}
                  >
                    {selectedLine.name}
                  </span>
                )}
              </div>
              <p className="pm-minutes">
                {first.eta_minutes}
                <small>minutos</small>
              </p>
              <div className="pm-hero-meta">
                <div className="pm-meta-box">
                  <span>Destino</span>
                  <strong>{first.destination}</strong>
                </div>
                <div className="pm-meta-box">
                  <span>Andén</span>
                  <strong>{first.platform}</strong>
                </div>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section aria-labelledby="pm-next-title">
              <h2 className="pm-section-title" id="pm-next-title">Siguientes trenes</h2>
              <div className="pm-list-card">
                {rest.map((t, i) => (
                  <article className="pm-train-row" key={i}>
                    <div>
                      <div className="pm-eta">{t.eta_minutes} min</div>
                      <div className="pm-destination">Destino: {t.destination}</div>
                    </div>
                    <div className="pm-platform">Andén {t.platform}</div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="pm-status-card" aria-labelledby="pm-service-title">
            <div>
              <div className="pm-label" id="pm-service-title">Estado del servicio</div>
              <div className="pm-status-pill">
                <span className="pm-dot" aria-hidden="true" />
                Servicio normal
              </div>
              <div className="pm-updated">Actualizado a las {updatedAt}</div>
            </div>
          </section>
        </>
      );
    }

    if (uiState.status === "empty") {
      return (
        <div className="pm-hero-card">
          <div className="pm-idle-hint">Sin datos disponibles en este momento</div>
        </div>
      );
    }

    return null;
  };

  return (
    <main className="pm-app" aria-label="Próximo Metro Madrid">
      <div className="pm-statusbar">
        <span>{time}</span>
        <span>Madrid · Metro</span>
      </div>

      <div className="pm-screen">
        <header className="pm-header">
          <div className="pm-brand">
            <div className="pm-logo">
              <MetroIcon />
            </div>
            <div>
              <h1>Próximo Metro</h1>
              <p>Consulta rápida · Metro de Madrid</p>
            </div>
          </div>
          <button className="pm-icon-btn" type="button" onClick={toggleTheme} aria-label="Cambiar tema">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        <section className="pm-field" aria-labelledby="pm-station-label">
          <div>
            <div className="pm-label" id="pm-station-label">Estación</div>
          </div>

          {ctx.isLoadingCatalogue ? (
            <div
              className="pm-skeleton"
              style={{ height: "52px", borderRadius: "14px" }}
              aria-label="Cargando estaciones"
            />
          ) : (
            <select
              className="pm-select"
              aria-label="Seleccionar estación"
              value={ctx.selectedStationId ?? ""}
              onChange={(e) => ctx.selectStation(e.target.value)}
            >
              <option value="" disabled>Selecciona una estación…</option>
              {(ctx.catalogue?.stations ?? [])
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "es"))
                .map((s) => (
                  <option key={s.station_id} value={s.station_id}>
                    {favorites.some((f) => f.stationId === s.station_id) ? "★ " : ""}{s.name}
                  </option>
                ))}
            </select>
          )}

          {ctx.availableLines.length > 0 && (
            <div className="pm-lines" aria-label="Líneas disponibles">
              {ctx.availableLines.map((line: Line) => (
                <button
                  key={line.line_id}
                  type="button"
                  className={`pm-line-chip${ctx.selectedLineId === line.line_id ? " is-active" : ""}`}
                  style={
                    ctx.selectedLineId === line.line_id
                      ? { background: line.color_hex, color: "#fff", borderColor: line.color_hex }
                      : { background: line.color_hex + "22", color: line.color_hex }
                  }
                  onClick={() => ctx.selectLine(line.line_id)}
                  aria-pressed={ctx.selectedLineId === line.line_id}
                >
                  {line.name}
                </button>
              ))}
            </div>
          )}

          {ctx.availableDirections.length > 0 && (
            <div>
              <div className="pm-label">Dirección</div>
              <select
                className="pm-select"
                aria-label="Seleccionar dirección"
                value={ctx.selectedDirection ?? ""}
                onChange={(e) => ctx.selectDirection(e.target.value)}
              >
                <option value="" disabled>Selecciona dirección…</option>
                {ctx.availableDirections.map((d) => (
                  <option key={d.direction_id} value={d.terminal_name}>
                    {d.terminal_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        {renderContent()}
      </div>

      {ctx.selectedContext && (
        <div className="pm-actions">
          <button className="pm-btn pm-btn-secondary" type="button" onClick={() => ctx.reset()}>
            Cambiar estación
          </button>
          <button
            className="pm-btn pm-btn-primary"
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      )}
    </main>
  );
}
