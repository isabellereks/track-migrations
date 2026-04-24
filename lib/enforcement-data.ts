import type { CriminalHistory } from "./colors";
import { ICE_AOR_CENTROIDS } from "./geo";

export interface MonthlyEnforcement {
  month: string;
  arrests: number;
  arrestsAtLarge: number;
  arrestsCustodial: number;
  detained: number;
  removals: number;
  byNationality: Array<{
    countryCode: string;
    name: string;
    arrests: number;
    removals: number;
  }>;
  byCriminalHistory: Record<CriminalHistory, number>;
  byAOR: Array<{
    aor: string;
    arrests: number;
  }>;
}

export interface ArrestRecord {
  month: string;
  aor: string;
  nationality: string;
  nationalityName: string;
  criminalHistory: CriminalHistory;
  arrestType: "at-large" | "custodial";
  count: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const ARREST_NATIONALITIES = [
  { code: "MX", name: "Mexico", weight: 28 },
  { code: "GT", name: "Guatemala", weight: 14 },
  { code: "HN", name: "Honduras", weight: 11 },
  { code: "VE", name: "Venezuela", weight: 10 },
  { code: "CO", name: "Colombia", weight: 7 },
  { code: "SV", name: "El Salvador", weight: 5 },
  { code: "EC", name: "Ecuador", weight: 5 },
  { code: "NI", name: "Nicaragua", weight: 4 },
  { code: "BR", name: "Brazil", weight: 3 },
  { code: "CU", name: "Cuba", weight: 3 },
  { code: "HT", name: "Haiti", weight: 3 },
  { code: "IN", name: "India", weight: 2 },
  { code: "CD", name: "DR Congo", weight: 1 },
  { code: "XX", name: "Other", weight: 4 },
];

const AORS = Object.keys(ICE_AOR_CENTROIDS);

const AOR_WEIGHTS: Record<string, number> = {
  Houston: 12, Dallas: 10, "Los Angeles": 10, Chicago: 8,
  "San Antonio": 8, Miami: 7, "New York": 7, Phoenix: 7,
  Newark: 6, Atlanta: 6, Denver: 5, "El Paso": 5,
  "San Diego": 5, "Washington DC": 4, Boston: 4,
  Philadelphia: 4, "San Francisco": 4, "New Orleans": 3,
  Detroit: 3, Minneapolis: 3, Baltimore: 3, Seattle: 3,
  Buffalo: 2, "Salt Lake City": 2, "St. Paul": 2,
};

function arrestMultiplier(month: string): number {
  const [y, m] = month.split("-").map(Number);
  if (y === 2025 && m <= 1) return 1.0;
  if (y === 2025 && m <= 3) return 2.5;
  if (y === 2025 && m <= 6) return 3.2;
  if (y === 2025 && m <= 9) return 3.8;
  if (y === 2025) return 4.0;
  if (y === 2026 && m <= 1) return 4.2;
  if (y === 2026 && m <= 3) return 4.5;
  return 1.0;
}

export function generateEnforcementData(): ArrestRecord[] {
  const rand = seededRandom(99);
  const records: ArrestRecord[] = [];
  const months: string[] = [];

  for (let y = 2025; y <= 2026; y++) {
    const maxM = y === 2026 ? 3 : 12;
    for (let m = 1; m <= maxM; m++) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }

  for (const month of months) {
    const mult = arrestMultiplier(month);

    for (const nat of ARREST_NATIONALITIES) {
      const numAORs = Math.max(1, Math.floor(rand() * 4) + 1);
      for (let a = 0; a < numAORs; a++) {
        const totalW = AORS.reduce((s, aor) => s + (AOR_WEIGHTS[aor] ?? 1), 0);
        let pick = rand() * totalW;
        let chosenAOR = AORS[0];
        for (const aor of AORS) {
          pick -= AOR_WEIGHTS[aor] ?? 1;
          if (pick <= 0) { chosenAOR = aor; break; }
        }

        const crimRoll = rand();
        let criminalHistory: CriminalHistory;
        if (crimRoll < 0.736) criminalHistory = "immigration-only";
        else if (crimRoll < 0.838) criminalHistory = "pending-charges";
        else criminalHistory = "convicted";

        const arrestType = rand() < 0.61 ? "at-large" as const : "custodial" as const;

        const baseCount = nat.weight * 2 * mult;
        const count = Math.max(1, Math.round(baseCount * (0.4 + rand() * 1.2)));

        records.push({
          month,
          aor: chosenAOR,
          nationality: nat.code,
          nationalityName: nat.name,
          criminalHistory,
          arrestType,
          count,
        });
      }
    }
  }

  return records;
}

let _enfCache: ArrestRecord[] | null = null;
export function getEnforcementData(): ArrestRecord[] {
  if (!_enfCache) _enfCache = generateEnforcementData();
  return _enfCache;
}

export function getEnforcementMonths(): string[] {
  const months: string[] = [];
  for (let y = 2025; y <= 2026; y++) {
    const maxM = y === 2026 ? 3 : 12;
    for (let m = 1; m <= maxM; m++) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

export function aggregateEnforcementByMonth(data: ArrestRecord[]): MonthlyEnforcement[] {
  const map = new Map<string, MonthlyEnforcement>();

  for (const r of data) {
    let m = map.get(r.month);
    if (!m) {
      m = {
        month: r.month,
        arrests: 0,
        arrestsAtLarge: 0,
        arrestsCustodial: 0,
        detained: 0,
        removals: 0,
        byNationality: [],
        byCriminalHistory: { convicted: 0, "pending-charges": 0, "immigration-only": 0 },
        byAOR: [],
      };
      map.set(r.month, m);
    }
    m.arrests += r.count;
    if (r.arrestType === "at-large") m.arrestsAtLarge += r.count;
    else m.arrestsCustodial += r.count;
    m.byCriminalHistory[r.criminalHistory] += r.count;
  }

  for (const m of map.values()) {
    m.detained = Math.round(m.arrests * 0.45);
    m.removals = Math.round(m.arrests * 0.35);

    const natMap = new Map<string, { name: string; arrests: number; removals: number }>();
    for (const r of data) {
      if (r.month !== m.month) continue;
      const existing = natMap.get(r.nationality);
      if (existing) {
        existing.arrests += r.count;
        existing.removals += Math.round(r.count * 0.35);
      } else {
        natMap.set(r.nationality, {
          name: r.nationalityName,
          arrests: r.count,
          removals: Math.round(r.count * 0.35),
        });
      }
    }
    m.byNationality = Array.from(natMap.entries())
      .map(([code, v]) => ({ countryCode: code, ...v }))
      .sort((a, b) => b.arrests - a.arrests)
      .slice(0, 5);

    const aorMap = new Map<string, number>();
    for (const r of data) {
      if (r.month !== m.month) continue;
      aorMap.set(r.aor, (aorMap.get(r.aor) ?? 0) + r.count);
    }
    m.byAOR = Array.from(aorMap.entries())
      .map(([aor, arrests]) => ({ aor, arrests }))
      .sort((a, b) => b.arrests - a.arrests)
      .slice(0, 10);
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export const ENFORCEMENT_STATS = {
  currentDetained: 60311,
  deathsInCustody: 47,
  fy2026RemovalsYTD: 234236,
  arrestsPerDayMarch2026: 955,
};
