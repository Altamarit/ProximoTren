import { NextResponse } from "next/server";
import { CatalogueSchema } from "@/lib/types/catalogue";
import stationsRaw from "../../../../public/data/stations.json";
import linesRaw from "../../../../public/data/lines.json";
import directionsRaw from "../../../../public/data/directions.json";

// Validate once at module load (cold start) — fails fast if data is corrupt.
const catalogue = CatalogueSchema.parse({
  stations: stationsRaw,
  lines: linesRaw,
  directions: directionsRaw,
});

export function GET() {
  return NextResponse.json(catalogue);
}
