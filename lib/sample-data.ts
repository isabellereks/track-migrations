import type { EncounterRecord } from "./types";
import type { OriginRegion } from "./colors";

import particlesJson from "@/data/particles.json";
import monthsJson from "@/data/months.json";

const _particles = particlesJson as EncounterRecord[];
const _months = monthsJson as string[];

export function getSampleData(): EncounterRecord[] {
  return _particles;
}

export function getMonths(): string[] {
  return _months;
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

export function topVisaClasses(
  data: EncounterRecord[],
  month: string,
  n = 5
) {
  const map = new Map<string, { visaClass: string; label: string; count: number }>();
  for (const r of data) {
    if (r.month > month || !r.visaClass) continue;
    const key = r.visaClass;
    const existing = map.get(key);
    if (existing) {
      existing.count += r.count;
    } else {
      map.set(key, {
        visaClass: key,
        label: r.visaClassLabel ?? key,
        count: r.count,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
