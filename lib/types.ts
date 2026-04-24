import type { OriginRegion, EncounterType } from "./colors";

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
  topOrigins: Array<{
    country: string;
    count: number;
  }>;
}

export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  opacity: number;
  birthMonth: string;
  settled: boolean;
  vx: number;
  vy: number;
}

export type FilterState = {
  regions: Set<OriginRegion>;
  sectors: Set<string>;
  demographics: Set<string>;
  encounterTypes: Set<EncounterType>;
};
