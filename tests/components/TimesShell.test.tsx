import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimesShell, NextTrainCard } from "@/components/TimesShell";
import type { UIState } from "@/types/ui-state.types";

const train = { eta_minutes: 3, destination: "Valdecarros", platform: "2" };
const trains2 = [
  { eta_minutes: 3, destination: "Valdecarros", platform: "2" },
  { eta_minutes: 8, destination: "Valdecarros", platform: "2" },
  { eta_minutes: 13, destination: "Valdecarros", platform: "2" },
];

const liveState: UIState = {
  status: "live",
  data: {
    source: "live",
    data: {
      station_id: "PAR_SOL",
      line_id: "L1",
      direction: "Valdecarros",
      trains: trains2,
      fetched_at_iso: "2026-06-14T10:00:00Z",
    },
    timestamp: "2026-06-14T10:00:00Z",
    cache_age_seconds: null,
    error_context: null,
  },
};

const cacheState: UIState = {
  status: "cache",
  data: {
    source: "cache",
    data: {
      station_id: "PAR_SOL",
      line_id: "L1",
      direction: "Valdecarros",
      trains: trains2,
      fetched_at_iso: "2026-06-14T10:00:00Z",
    },
    timestamp: "2026-06-14T10:00:00Z",
    cache_age_seconds: 90,
    error_context: null,
  },
};

const emptyState: UIState = {
  status: "empty",
  errorContext: { message: "CRTM down", type: "CRTMAPIError" },
};

const loadingState: UIState = { status: "loading" };
const idleState: UIState = { status: "idle" };

const noop = () => {};

// ─────────────────────────────────────────────────────────────────────────────
// NextTrainCard (E6-S2)
// ─────────────────────────────────────────────────────────────────────────────

describe("NextTrainCard", () => {
  it("AC-1 — eta_minutes element has font-size ≥ 32px", () => {
    render(<NextTrainCard train={train} />);
    const el = screen.getByTestId("eta-minutes") as HTMLElement;
    expect(parseInt(el.style.fontSize)).toBeGreaterThanOrEqual(32);
  });

  it("AC-1 — renders the numeric eta_minutes value", () => {
    render(<NextTrainCard train={train} />);
    expect(screen.getByTestId("eta-minutes").textContent).toContain("3");
  });

  it("AC-3 — renders the platform", () => {
    render(<NextTrainCard train={train} />);
    expect(screen.getByTestId("train-platform").textContent).toContain("2");
  });

  it("AC-4 — renders the destination", () => {
    render(<NextTrainCard train={train} />);
    expect(screen.getByTestId("train-destination").textContent).toContain("Valdecarros");
  });

  it("AC-5 — text color is #1a1a1a (contrast ≥ 4.5:1 on white)", () => {
    render(<NextTrainCard train={train} />);
    const el = screen.getByTestId("eta-minutes") as HTMLElement;
    // jsdom normalizes hex to rgb(); either form confirms the correct dark color
    expect(el.style.color).toMatch(/#1a1a1a|rgb\(26,\s*26,\s*26\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TimesShell (E6-S1)
// ─────────────────────────────────────────────────────────────────────────────

describe("TimesShell", () => {
  describe("AC-1 — UIState propagation", () => {
    it("renders NextTrainCard when state is live", () => {
      render(<TimesShell uiState={liveState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("next-train-card")).toBeDefined();
    });

    it("renders NextTrainCard when state is cache", () => {
      render(<TimesShell uiState={cacheState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("next-train-card")).toBeDefined();
    });

    it("renders EmptyState when state is empty", () => {
      render(<TimesShell uiState={emptyState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("empty-state")).toBeDefined();
    });
  });

  describe("AC-2 — Loading state", () => {
    it("shows loading skeleton when status is loading", () => {
      render(<TimesShell uiState={loadingState} onRefresh={noop} isRefreshing={true} />);
      expect(screen.getByTestId("loading-skeleton")).toBeDefined();
    });

    it("refresh button is disabled when isRefreshing", () => {
      render(<TimesShell uiState={loadingState} onRefresh={noop} isRefreshing={true} />);
      const btn = screen.getByTestId("refresh-button") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it("does not render train data while loading", () => {
      render(<TimesShell uiState={loadingState} onRefresh={noop} isRefreshing={true} />);
      expect(screen.queryByTestId("next-train-card")).toBeNull();
    });
  });

  describe("AC-3 — Correct child components rendered", () => {
    it("renders following trains list for live state with multiple trains", () => {
      render(<TimesShell uiState={liveState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("following-trains-list")).toBeDefined();
      // 3 trains total → 1 NextTrainCard + 2 in following list
      expect(screen.getAllByTestId(/^following-train-/)).toHaveLength(2);
    });

    it("renders service status indicator for live state", () => {
      render(<TimesShell uiState={liveState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("service-status").textContent).toContain("tiempo real");
    });

    it("renders stale data warning for cache state", () => {
      render(<TimesShell uiState={cacheState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("stale-data-warning")).toBeDefined();
    });

    it("does not render stale warning for live state", () => {
      render(<TimesShell uiState={liveState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.queryByTestId("stale-data-warning")).toBeNull();
    });
  });

  describe("AC-4 — ActionBar refresh button", () => {
    it("refresh button is always visible", () => {
      render(<TimesShell uiState={idleState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("refresh-button")).toBeDefined();
    });

    it("calls onRefresh when button is clicked", () => {
      const onRefresh = vi.fn();
      render(<TimesShell uiState={liveState} onRefresh={onRefresh} isRefreshing={false} />);
      fireEvent.click(screen.getByTestId("refresh-button"));
      expect(onRefresh).toHaveBeenCalledOnce();
    });

    it("refresh button is enabled when not refreshing", () => {
      render(<TimesShell uiState={liveState} onRefresh={noop} isRefreshing={false} />);
      const btn = screen.getByTestId("refresh-button") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });

  describe("Idle state", () => {
    it("shows idle message when status is idle", () => {
      render(<TimesShell uiState={idleState} onRefresh={noop} isRefreshing={false} />);
      expect(screen.getByTestId("idle-state")).toBeDefined();
    });
  });
});
