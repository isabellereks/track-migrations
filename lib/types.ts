import type { OriginRegion, EncounterType } from "./colors";

export type MigrationLayer =
  | "legal-employment"
  | "legal-family"
  | "legal-diversity"
  | "refugee"
  | "asylum"
  | "border-entered"
  | "border-inadmissible"
  | "border-turnedaway"
  | "overstay"
  | "uncounted";

export type FilterPreset = "all" | "legal" | "border" | "overstays" | "uncounted" | "arrests";

export const FILTER_LAYERS: Record<FilterPreset, MigrationLayer[]> = {
  all: [
    "legal-employment", "legal-family", "legal-diversity",
    "refugee", "asylum",
    "border-entered", "border-inadmissible", "border-turnedaway",
    "overstay", "uncounted",
  ],
  legal: ["legal-employment", "legal-family", "legal-diversity", "refugee", "asylum"],
  border: ["border-entered", "border-inadmissible", "border-turnedaway"],
  overstays: ["overstay"],
  uncounted: ["uncounted"],
  arrests: ["border-entered", "overstay"],
};

export const LAYER_LABEL: Record<MigrationLayer, string> = {
  "legal-employment": "Employment-based",
  "legal-family": "Family-sponsored",
  "legal-diversity": "Diversity visa",
  refugee: "Refugee",
  asylum: "Asylum",
  "border-entered": "Border (entered)",
  "border-inadmissible": "Port of entry",
  "border-turnedaway": "Turned away",
  overstay: "Visa overstay",
  uncounted: "Uncounted (est.)",
};

export interface DotStyle {
  fill: string;
  radius: number;
  opacity: number;
  stroke?: string;
  strokeWidth?: number;
  dashed?: boolean;
}

export const DOT_STYLES: Record<MigrationLayer, DotStyle> = {
  "legal-employment":    { fill: "#7090C8", radius: 2.5, opacity: 0.8 },
  "legal-family":        { fill: "#D9A766", radius: 2.5, opacity: 0.8 },
  "legal-diversity":     { fill: "#7EBC8E", radius: 2.5, opacity: 0.8 },
  refugee:               { fill: "#AF52DE", radius: 2.5, opacity: 0.8 },
  asylum:                { fill: "#D98080", radius: 2.5, opacity: 0.8 },
  "border-entered":      { fill: "#C8534A", radius: 2.5, opacity: 0.8 },
  "border-inadmissible": { fill: "#C8534A", radius: 2.5, opacity: 0.5, stroke: "#C8534A", strokeWidth: 0.5 },
  "border-turnedaway":   { fill: "#C8534A", radius: 1.8, opacity: 0.3 },
  overstay:              { fill: "#C89554", radius: 2.5, opacity: 0.7 },
  uncounted:             { fill: "#AEAEB2", radius: 2.5, opacity: 0.35, dashed: true },
};

export type ParticlePhase =
  | "incoming"
  | "settled"
  | "faded"
  | "departing"
  | "migrating-to-arrest"
  | "arrested";

export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  opacity: number;
  birthMonth: string;
  settled: boolean;

  layer: MigrationLayer;
  nationality: string;
  nationalityName: string;
  region: OriginRegion;
  sector: string;
  demographic: string;
  entryType: string;

  phase: ParticlePhase;
  hasArrest: boolean;
  arrestX: number;
  arrestY: number;
  crossingX: number;
  crossingY: number;
  migrationT: number;
  migrationDelay: number;
  migrationDuration: number;
  trailDrawn: boolean;

  // For turned-away fade
  spawnTime: number;
}

export interface EncounterRecord {
  month: string;
  sector: string;
  sectorLat: number;
  sectorLng: number;
  nationality: string;
  nationalityName: string;
  region: OriginRegion;
  type: EncounterType;
  demographic: "single-adult" | "family-unit" | "unaccompanied-child";
  count: number;
  layer: MigrationLayer;
}

export interface MonthlyTotal {
  month: string;
  total: number;
  bySector: Record<string, number>;
  byRegion: Record<string, number>;
  byNationality: Record<string, number>;
}

export interface StateSettlement {
  fips: string;
  state: string;
  foreignBornTotal: number;
  foreignBornPrior: number;
  delta: number;
  topOrigins: Array<{ country: string; count: number }>;
}

export type FilterState = {
  activeLayers: Set<MigrationLayer>;
  activePreset: FilterPreset;
};
