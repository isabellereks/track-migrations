import type { EncounterRecord, MigrationLayer } from "./types";
import type { OriginRegion, EncounterType } from "./colors";
import { SECTOR_CENTROIDS } from "./geo";

const SECTORS = Object.keys(SECTOR_CENTROIDS);
const SW_SECTORS = [
  "rio-grande-valley", "laredo", "del-rio", "big-bend",
  "el-paso", "tucson", "yuma", "el-centro", "san-diego",
];

interface NatDef {
  code: string;
  name: string;
  region: OriginRegion;
  borderWeight: number;
  legalWeight: number;
  legalReason: "employment" | "family" | "diversity" | "refugee" | "asylum";
  overstayWeight: number;
}

const NATIONALITIES: NatDef[] = [
  { code: "MX", name: "Mexico", region: "mexico", borderWeight: 30, legalWeight: 8, legalReason: "family", overstayWeight: 5 },
  { code: "GT", name: "Guatemala", region: "central-america", borderWeight: 12, legalWeight: 2, legalReason: "asylum", overstayWeight: 1 },
  { code: "HN", name: "Honduras", region: "central-america", borderWeight: 10, legalWeight: 2, legalReason: "asylum", overstayWeight: 1 },
  { code: "SV", name: "El Salvador", region: "central-america", borderWeight: 6, legalWeight: 2, legalReason: "family", overstayWeight: 1 },
  { code: "NI", name: "Nicaragua", region: "central-america", borderWeight: 5, legalWeight: 1, legalReason: "asylum", overstayWeight: 0.5 },
  { code: "CU", name: "Cuba", region: "caribbean", borderWeight: 6, legalWeight: 3, legalReason: "family", overstayWeight: 2 },
  { code: "HT", name: "Haiti", region: "caribbean", borderWeight: 4, legalWeight: 1, legalReason: "refugee", overstayWeight: 1 },
  { code: "VE", name: "Venezuela", region: "south-america", borderWeight: 7, legalWeight: 1, legalReason: "asylum", overstayWeight: 2 },
  { code: "CO", name: "Colombia", region: "south-america", borderWeight: 4, legalWeight: 3, legalReason: "family", overstayWeight: 3 },
  { code: "BR", name: "Brazil", region: "south-america", borderWeight: 3, legalWeight: 2, legalReason: "family", overstayWeight: 4 },
  { code: "EC", name: "Ecuador", region: "south-america", borderWeight: 3, legalWeight: 2, legalReason: "family", overstayWeight: 2 },
  { code: "IN", name: "India", region: "asia", borderWeight: 1, legalWeight: 25, legalReason: "employment", overstayWeight: 6 },
  { code: "CN", name: "China", region: "asia", borderWeight: 1, legalWeight: 15, legalReason: "employment", overstayWeight: 5 },
  { code: "PH", name: "Philippines", region: "asia", borderWeight: 0.5, legalWeight: 10, legalReason: "family", overstayWeight: 3 },
  { code: "KR", name: "South Korea", region: "asia", borderWeight: 0, legalWeight: 4, legalReason: "employment", overstayWeight: 2 },
  { code: "RO", name: "Romania", region: "europe", borderWeight: 0.5, legalWeight: 2, legalReason: "diversity", overstayWeight: 2 },
  { code: "NG", name: "Nigeria", region: "africa", borderWeight: 0.5, legalWeight: 4, legalReason: "diversity", overstayWeight: 2 },
  { code: "CD", name: "DR Congo", region: "africa", borderWeight: 0.5, legalWeight: 2, legalReason: "refugee", overstayWeight: 0.5 },
  { code: "ET", name: "Ethiopia", region: "africa", borderWeight: 0.3, legalWeight: 2, legalReason: "refugee", overstayWeight: 1 },
  { code: "DO", name: "Dominican Rep.", region: "caribbean", borderWeight: 0.5, legalWeight: 6, legalReason: "family", overstayWeight: 2 },
  { code: "XX", name: "Other", region: "other", borderWeight: 2, legalWeight: 5, legalReason: "diversity", overstayWeight: 3 },
];

const DEMOGRAPHICS = ["single-adult", "family-unit", "unaccompanied-child"] as const;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateMonths(): string[] {
  const months: string[] = [];
  for (let y = 2020; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2025 && m > 9) break;
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

function borderMultiplier(month: string): number {
  const [y] = month.split("-").map(Number);
  if (y === 2020) return 0.4;
  if (y === 2021) return 1.2;
  if (y === 2022) return 1.8;
  if (y === 2023) return 2.0;
  if (y === 2024) return 1.5;
  return 1.3;
}

function legalMultiplier(month: string): number {
  const [y] = month.split("-").map(Number);
  if (y === 2020) return 0.5;
  if (y === 2021) return 0.7;
  if (y === 2022) return 0.9;
  if (y === 2023) return 1.0;
  if (y === 2024) return 1.1;
  return 1.0;
}

function encounterType(month: string, rand: () => number): EncounterType {
  const [y] = month.split("-").map(Number);
  const r = rand();
  if (y >= 2020 && y <= 2022) {
    if (r < 0.4) return "expulsion";
    if (r < 0.8) return "apprehension";
    return "inadmissible";
  }
  if (y >= 2023) {
    if (r < 0.1) return "cbp-one";
    if (r < 0.7) return "apprehension";
    return "inadmissible";
  }
  if (r < 0.75) return "apprehension";
  return "inadmissible";
}

function layerFromLegalReason(reason: string): MigrationLayer {
  if (reason === "employment") return "legal-employment";
  if (reason === "family") return "legal-family";
  if (reason === "diversity") return "legal-diversity";
  if (reason === "refugee") return "refugee";
  if (reason === "asylum") return "asylum";
  return "legal-family";
}

export function generateSampleData(): EncounterRecord[] {
  const rand = seededRandom(42);
  const months = generateMonths();
  const records: EncounterRecord[] = [];

  for (const month of months) {
    const bMult = borderMultiplier(month);
    const lMult = legalMultiplier(month);

    for (const nat of NATIONALITIES) {
      // Border encounters
      if (nat.borderWeight > 0) {
        const sectorPool = nat.region === "europe" || nat.region === "asia" || nat.region === "africa"
          ? SECTORS : SW_SECTORS;
        const numSectors = Math.max(1, Math.floor(rand() * 3) + 1);

        for (let s = 0; s < numSectors; s++) {
          const sector = sectorPool[Math.floor(rand() * sectorPool.length)];
          const [lat, lng] = SECTOR_CENTROIDS[sector];
          const demo = DEMOGRAPHICS[Math.floor(rand() * DEMOGRAPHICS.length)];
          const type = encounterType(month, rand);

          let layer: MigrationLayer;
          if (type === "expulsion") layer = "border-turnedaway";
          else if (type === "inadmissible" || type === "cbp-one") layer = "border-inadmissible";
          else layer = "border-entered";

          const baseCount = nat.borderWeight * 12 * bMult;
          const count = Math.max(5, Math.round(baseCount * (0.5 + rand() * 1.0)));

          records.push({
            month, sector, sectorLat: lat, sectorLng: lng,
            nationality: nat.code, nationalityName: nat.name,
            region: nat.region, type, demographic: demo, count, layer,
          });
        }
      }

      // Legal immigration
      if (nat.legalWeight > 0) {
        const legalLayer = layerFromLegalReason(nat.legalReason);
        const baseCount = nat.legalWeight * 8 * lMult;
        const count = Math.max(5, Math.round(baseCount * (0.5 + rand() * 1.0)));
        const sector = "port-of-entry";

        records.push({
          month, sector, sectorLat: 0, sectorLng: 0,
          nationality: nat.code, nationalityName: nat.name,
          region: nat.region, type: "inadmissible" as EncounterType,
          demographic: DEMOGRAPHICS[Math.floor(rand() * 2)], count, layer: legalLayer,
        });
      }

      // Overstays
      if (nat.overstayWeight > 0 && rand() < 0.3) {
        const baseCount = nat.overstayWeight * 4 * lMult;
        const count = Math.max(2, Math.round(baseCount * (0.3 + rand() * 0.8)));

        records.push({
          month, sector: "airport", sectorLat: 0, sectorLng: 0,
          nationality: nat.code, nationalityName: nat.name,
          region: nat.region, type: "inadmissible" as EncounterType,
          demographic: "single-adult", count, layer: "overstay",
        });
      }
    }

    // Uncounted (aggregate estimate)
    const uncountedCount = Math.round(800 * (0.7 + rand() * 0.6));
    records.push({
      month, sector: "unknown", sectorLat: 0, sectorLng: 0,
      nationality: "XX", nationalityName: "Uncounted",
      region: "other", type: "apprehension" as EncounterType,
      demographic: "single-adult", count: uncountedCount, layer: "uncounted",
    });
  }

  return records;
}

let _cache: EncounterRecord[] | null = null;
export function getSampleData(): EncounterRecord[] {
  if (!_cache) _cache = generateSampleData();
  return _cache;
}

export function getMonths(): string[] {
  return generateMonths();
}

export function aggregateByMonth(data: EncounterRecord[]) {
  const map = new Map<string, number>();
  for (const r of data) {
    map.set(r.month, (map.get(r.month) ?? 0) + r.count);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

export function topNationalities(
  data: EncounterRecord[],
  month: string,
  n = 5
) {
  const map = new Map<string, { name: string; region: OriginRegion; count: number }>();
  for (const r of data) {
    if (r.month > month) continue;
    const existing = map.get(r.nationality);
    if (existing) {
      existing.count += r.count;
    } else {
      map.set(r.nationality, {
        name: r.nationalityName,
        region: r.region,
        count: r.count,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function totalUpToMonth(
  data: EncounterRecord[],
  month: string
): number {
  let total = 0;
  for (const r of data) {
    if (r.month <= month) total += r.count;
  }
  return total;
}
