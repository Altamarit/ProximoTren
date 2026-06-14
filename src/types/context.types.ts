import { z } from "zod";

// ── SelectedContext ───────────────────────────────────────────────────────────
// The three-tuple that uniquely identifies a user's current selection:
// which station, which line at that station, and in which direction.

export const SelectedContextSchema = z.object({
  stationId: z.string().min(1),
  lineId: z.string().min(1),
  direction: z.string().min(1),
});

export type SelectedContext = z.infer<typeof SelectedContextSchema>;

// ── FavoriteEntry ─────────────────────────────────────────────────────────────
// A saved context entry persisted in localStorage (FR-019).
// addedAt is an ISO 8601 datetime string so it survives JSON serialization.

export const FavoriteEntrySchema = z.object({
  stationId: z.string().min(1),
  lineId: z.string().min(1),
  direction: z.string().min(1),
  addedAt: z.string().datetime({ offset: true }),
});

export type FavoriteEntry = z.infer<typeof FavoriteEntrySchema>;
