import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "@/hooks/useFavorites";
import type { FavoriteEntry } from "@/types/context.types";

const entry1: FavoriteEntry = {
  stationId: "PAR_SOL",
  lineId: "L1",
  direction: "Valdecarros",
  addedAt: "2026-06-14T10:00:00Z",
};

const entry2: FavoriteEntry = {
  stationId: "PAR_BILBAO",
  lineId: "L1",
  direction: "Pinar de Chamartín",
  addedAt: "2026-06-14T11:00:00Z",
};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe("useFavorites", () => {
  it("starts empty when localStorage is empty", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toHaveLength(0);
  });

  it("addFavorite adds an entry", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(entry1));
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].stationId).toBe("PAR_SOL");
  });

  it("addFavorite persists to localStorage", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(entry1));
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it("addFavorite is idempotent — duplicate is not added", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(entry1));
    act(() => result.current.addFavorite(entry1));
    expect(result.current.favorites).toHaveLength(1);
  });

  it("removeFavorite removes the matching entry", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(entry1));
    act(() => result.current.addFavorite(entry2));
    act(() => result.current.removeFavorite("PAR_SOL", "L1", "Valdecarros"));
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].stationId).toBe("PAR_BILBAO");
  });

  it("removeFavorite is a no-op if entry does not exist", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(entry1));
    act(() => result.current.removeFavorite("PAR_MISSING", "L1", "Somewhere"));
    expect(result.current.favorites).toHaveLength(1);
  });

  it("isFavorite returns true for an added entry", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.addFavorite(entry1));
    expect(result.current.isFavorite("PAR_SOL", "L1", "Valdecarros")).toBe(true);
  });

  it("isFavorite returns false for a non-existent entry", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite("PAR_SOL", "L1", "Valdecarros")).toBe(false);
  });

  it("reads existing valid entries from localStorage on mount", () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([entry1]));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].stationId).toBe("PAR_SOL");
  });

  it("gracefully handles corrupt localStorage data (empty result)", () => {
    localStorageMock.getItem.mockReturnValueOnce("not-valid-json{{{");
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toHaveLength(0);
  });
});
