"use client";

import { useState, useCallback } from "react";
import { FavoriteEntrySchema } from "@/types/context.types";
import type { FavoriteEntry } from "@/types/context.types";

const STORAGE_KEY = "proximo-metro-favorites";

function readFromStorage(): FavoriteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate each entry — silently drop invalid ones
    return parsed.flatMap((item) => {
      const result = FavoriteEntrySchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

function writeToStorage(favorites: FavoriteEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage may be unavailable (SSR, private mode quota exceeded)
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseFavoritesState {
  favorites: FavoriteEntry[];
  addFavorite: (entry: FavoriteEntry) => void;
  removeFavorite: (stationId: string, lineId: string, direction: string) => void;
  isFavorite: (stationId: string, lineId: string, direction: string) => boolean;
}

export function useFavorites(): UseFavoritesState {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>(() => readFromStorage());

  const addFavorite = useCallback((entry: FavoriteEntry) => {
    setFavorites((prev) => {
      const exists = prev.some(
        (f) => f.stationId === entry.stationId && f.lineId === entry.lineId && f.direction === entry.direction
      );
      if (exists) return prev;
      const next = [...prev, entry];
      writeToStorage(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((stationId: string, lineId: string, direction: string) => {
    setFavorites((prev) => {
      const next = prev.filter(
        (f) => !(f.stationId === stationId && f.lineId === lineId && f.direction === direction)
      );
      writeToStorage(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (stationId: string, lineId: string, direction: string) =>
      favorites.some((f) => f.stationId === stationId && f.lineId === lineId && f.direction === direction),
    [favorites]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
