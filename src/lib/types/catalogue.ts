import { z } from "zod";

// ── Station ───────────────────────────────────────────────────────────────────

export const StationSchema = z.object({
  station_id: z.string().min(1),
  name: z.string().min(1),
  line_ids: z.array(z.string().min(1)).min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export type Station = z.infer<typeof StationSchema>;

// ── Line ──────────────────────────────────────────────────────────────────────

export const LineSchema = z.object({
  line_id: z.string().min(1),
  name: z.string().min(1),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be #RRGGBB format"),
  terminal_stations: z.array(z.string().min(1)).length(2),
});

export type Line = z.infer<typeof LineSchema>;

// ── Direction ─────────────────────────────────────────────────────────────────

export const DirectionSchema = z.object({
  direction_id: z.string().min(1),
  line_id: z.string().min(1),
  terminal_name: z.string().min(1),
});

export type Direction = z.infer<typeof DirectionSchema>;

// ── Catalogue ─────────────────────────────────────────────────────────────────

export const CatalogueSchema = z.object({
  stations: z.array(StationSchema).min(1),
  lines: z.array(LineSchema).min(1),
  directions: z.array(DirectionSchema).min(1),
});

export type Catalogue = z.infer<typeof CatalogueSchema>;
