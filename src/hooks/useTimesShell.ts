"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BFFResponseSchema } from "@/types/ui-state.types";
import type { UIState, BFFResponse } from "@/types/ui-state.types";
import type { SelectedContext } from "@/types/context.types";

export interface UseTimesShellReturn {
  uiState: UIState;
  refresh: () => void;
  isRefreshing: boolean;
}

export function useTimesShell(context: SelectedContext | null): UseTimesShellReturn {
  const [uiState, setUIState] = useState<UIState>({ status: "idle" });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTimes = useCallback(
    async (ctx: SelectedContext) => {
      // Cancel previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRefreshing(true);
      setUIState({ status: "loading" });

      try {
        const url = new URL("/api/times", window.location.origin);
        url.searchParams.set("stationId", ctx.stationId);
        url.searchParams.set("lineId", ctx.lineId);
        url.searchParams.set("direction", ctx.direction);

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`BFF responded ${res.status}`);

        const json: unknown = await res.json();
        const bff: BFFResponse = BFFResponseSchema.parse(json);

        if (bff.source === "live" || bff.source === "cache") {
          setUIState({ status: bff.source, data: bff });
        } else {
          setUIState({ status: "empty", errorContext: bff.error_context });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setUIState({ status: "empty", errorContext: { message: (err as Error).message, type: "FetchError" } });
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!context) {
      setUIState({ status: "idle" });
      return;
    }
    void fetchTimes(context);
    return () => {
      abortRef.current?.abort();
    };
  }, [context, fetchTimes]);

  const refresh = useCallback(() => {
    if (context) void fetchTimes(context);
  }, [context, fetchTimes]);

  return { uiState, refresh, isRefreshing };
}
