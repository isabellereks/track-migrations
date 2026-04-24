import type { EncounterRecord } from "./types";
import type { OriginRegion, EncounterType } from "./colors";
import { SECTOR_CENTROIDS } from "./geo";

const SECTORS = Object.keys(SECTOR_CENTROIDS);
const SW_SECTORS = [
  "rio-grande-valley",
  "laredo",
  "del-rio",
  "big-bend",
  "el-paso",
  "tucson",
  "yuma",
  "el-centro",
  "san-diego",
];

const NATIONALITIES: Array<{
  code: string;
  name: string;
  region: OriginRegion;
  weight: number;
}> = [
  { code: "MX", name: "Mexico", region: "mexico", weight: 30 },
  { code: "GT", name: "Guatemala", region: "central-america", weight: 12 },
  { code: "HN", name: "Honduras", region: "central-america", weight: 10 },
  { code: "SV", name: "El Salvador", region: "central-america", weight: 6 },
  { code: "NI", name: "Nicaragua", region: "central-america", weight: 5 },
  { code: "CU", name: "Cuba", region: "caribbean", weight: 6 },
  { code: "HT", name: "Haiti", region: "caribbean", weight: 4 },
  { code: "VE", name: "Venezuela", region: "south-america", weight: 7 },
  { code: "CO", name: "Colombia", region: "south-america", weight: 4 },
  { code: "BR", name: "Brazil", region: "south-america", weight: 3 },
  { code: "EC", name: "Ecuador", region: "south-america", weight: 3 },
  { code: "IN", name: "India", region: "asia", weight: 3 },
  { code: "CN", name: "China", region: "asia", weight: 2 },
  { code: "RO", name: "Romania", region: "europe", weight: 1 },
  { code: "TR", name: "Turkey", region: "europe", weight: 1 },
  { code: "CD", name: "DR Congo", region: "africa", weight: 1 },
  { code: "SN", name: "Senegal", region: "africa", weight: 1 },
  { code: "XX", name: "Other", region: "other", weight: 2 },
];

const DEMOGRAPHICS = [
  "single-adult",
  "family-unit",
  "unaccompanied-child",
] as const;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateMonths(): string[] {
  const months: string[] = [];
  for (let y = 2016; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2025 && m > 9) break;
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

function encounterMultiplier(month: string): number {
  const [y] = month.split("-").map(Number);
  if (y <= 2018) return 0.5;
  if (y === 2019) return 0.8;
  if (y === 2020) return 0.4;
  if (y === 2021) return 1.2;
  if (y === 2022) return 1.8;
  if (y === 2023) return 2.0;
  if (y === 2024) return 1.5;
  return 1.3;
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

export function generateSampleData(): EncounterRecord[] {
  const rand = seededRandom(42);
  const months = generateMonths();
  const records: EncounterRecord[] = [];

  for (const month of months) {
    const mult = encounterMultiplier(month);

    for (const nat of NATIONALITIES) {
      const sectorPool =
        nat.region === "europe" || nat.region === "asia" || nat.region === "africa"
          ? SECTORS
          : SW_SECTORS;

      const numSectors = Math.max(1, Math.floor(rand() * 3) + 1);
      for (let s = 0; s < numSectors; s++) {
        const sector = sectorPool[Math.floor(rand() * sectorPool.length)];
        const [lat, lng] = SECTOR_CENTROIDS[sector];
        const demo = DEMOGRAPHICS[Math.floor(rand() * DEMOGRAPHICS.length)];
        const type = encounterType(month, rand);
        const baseCount = nat.weight * 15 * mult;
        const count = Math.max(
          10,
          Math.round(baseCount * (0.5 + rand() * 1.0))
        );

        records.push({
          month,
          sector,
          sectorLat: lat,
          sectorLng: lng,
          nationality: nat.code,
          nationalityName: nat.name,
          region: nat.region,
          type,
          demographic: demo,
          count,
        });
      }
    }
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
