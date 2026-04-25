// Cumulative sidebar aggregates, precomputed lazily per preset.
//
// Why this exists
// ---------------
// The naive sidebar implementation called three O(N) scans on the full
// ~136k-record dataset every time `currentMonth` changed:
//
//   total       = data.filter(r => r.month <= m).reduce(...)        // O(N)
//   topCountries= group(data.filter(r => r.month <= m), 5)           // O(N)
//   topVisas    = group(data.filter(r => r.month <= m && r.visa), 5) // O(N)
//
// During scrubbing/playback that's ~3 × O(N) per tick. With useDeferredValue
// the work is non-blocking, but it's still real CPU spend that fights the
// rAF loop for cycles.
//
// Strategy
// --------
// For each preset key (`all`, `legal`, `border-entered`, ...) we walk the
// dataset chronologically once, accumulating cumulative `total`, top-5
// nationalities, top-5 visa classes, and per-month total. We snapshot the
// accumulator at every month. Subsequent queries are O(1) Map lookups.
//
// The build is lazy: a preset's snapshots are computed only the first time
// it's queried, so users who never switch tabs only pay for "all". Build
// cost is ~10–30 ms per preset on a 136k-record dataset.

import type { MigrationLayer, EncounterRecord } from "./types";
import { FILTER_LAYERS, STATUS_LAYERS } from "./types";
import type { OriginRegion } from "./colors";
import { getSampleData, getMonths } from "./sample-data";

export interface SidebarSnapshot {
  cumulativeTotal: number;
  monthTotal: number;
  topCountries: Array<{ name: string; region: OriginRegion; count: number }>;
  topVisas: Array<{ visaClass: string; label: string; count: number }>;
}

const EMPTY_SNAPSHOT: SidebarSnapshot = {
  cumulativeTotal: 0,
  monthTotal: 0,
  topCountries: [],
  topVisas: [],
};

// All preset keys recognized by getSnapshot. Each key maps to (a) the layer
// set we care about and (b) an optional sub-filter (used by the border view
// where we want a strict subset of layers depending on entered/stopped).
type LayerFilter = (r: EncounterRecord) => boolean;

interface PresetSpec {
  layers: ReadonlyArray<MigrationLayer>;
  extra?: LayerFilter;
}

const _presets = new Map<string, PresetSpec>();

function registerPreset(key: string, spec: PresetSpec) {
  _presets.set(key, spec);
}

// Pathway presets
registerPreset("all", { layers: FILTER_LAYERS.all });
registerPreset("legal", { layers: FILTER_LAYERS.legal });
registerPreset("overstays", { layers: FILTER_LAYERS.overstays });
registerPreset("uncounted", { layers: FILTER_LAYERS.uncounted });
registerPreset("arrests", { layers: FILTER_LAYERS.arrests });
// Border preset is split by view because the sidebar shows different totals.
registerPreset("border-entered", {
  layers: FILTER_LAYERS.border,
  extra: (r) => r.layer === "border-entered" || r.layer === "border-inadmissible",
});
registerPreset("border-stopped", {
  layers: FILTER_LAYERS.border,
  extra: (r) => r.layer === "border-turnedaway" || r.layer === "border-inadmissible",
});

// Status presets (prefixed to avoid collisions with pathway names).
registerPreset("status-all", { layers: STATUS_LAYERS.all });
registerPreset("status-approved", { layers: STATUS_LAYERS.approved });
registerPreset("status-pending", { layers: STATUS_LAYERS.pending });
registerPreset("status-undocumented", { layers: STATUS_LAYERS.undocumented });
registerPreset("status-arrests", { layers: STATUS_LAYERS.arrests });

const _snapshotCache = new Map<string, Map<string, SidebarSnapshot>>();

function buildSnapshotsForPreset(key: string): Map<string, SidebarSnapshot> {
  const spec = _presets.get(key);
  if (!spec) return new Map();
  const data = getSampleData();

  const layerSet = new Set<MigrationLayer>(spec.layers);
  const extra = spec.extra;

  // Group filtered records by month
  const byMonth = new Map<string, EncounterRecord[]>();
  for (const r of data) {
    if (!layerSet.has(r.layer)) continue;
    if (extra && !extra(r)) continue;
    let arr = byMonth.get(r.month);
    if (!arr) {
      arr = [];
      byMonth.set(r.month, arr);
    }
    arr.push(r);
  }

  // Iterate the canonical month list (the same one the TimeScrubber uses) so
  // every scrubbable month gets a snapshot. Months with no records carry
  // forward the previous cumulative state with monthTotal=0 — otherwise the
  // sidebar would drop to zero for valid scrubs (e.g. "Legal" at 2025-10,
  // "Overstays" after 2024-10) where the preset has data gaps.
  const allMonths = getMonths();

  let cumulativeTotal = 0;
  const cumByNat = new Map<
    string,
    { name: string; region: OriginRegion; count: number }
  >();
  const cumByVisa = new Map<
    string,
    { visaClass: string; label: string; count: number }
  >();

  // Re-use the same top-N arrays across months when nothing changes. As long
  // as cumByNat / cumByVisa weren't mutated this month, the snapshot's
  // ordering is identical to the previous month's, so we can share the
  // reference instead of recomputing topN.
  let lastTopCountries: SidebarSnapshot["topCountries"] = [];
  let lastTopVisas: SidebarSnapshot["topVisas"] = [];
  const result = new Map<string, SidebarSnapshot>();

  for (const month of allMonths) {
    const monthRecords = byMonth.get(month);
    let monthTotal = 0;
    let mutated = false;

    if (monthRecords) {
      mutated = true;
      for (const r of monthRecords) {
        monthTotal += r.count;
        const natExisting = cumByNat.get(r.nationality);
        if (natExisting) natExisting.count += r.count;
        else
          cumByNat.set(r.nationality, {
            name: r.nationalityName,
            region: r.region,
            count: r.count,
          });
        if (r.visaClass) {
          const visaExisting = cumByVisa.get(r.visaClass);
          if (visaExisting) visaExisting.count += r.count;
          else
            cumByVisa.set(r.visaClass, {
              visaClass: r.visaClass,
              label: r.visaClassLabel ?? r.visaClass,
              count: r.count,
            });
        }
      }
      cumulativeTotal += monthTotal;
    }

    if (mutated) {
      lastTopCountries = topN(cumByNat, 5);
      lastTopVisas = topN(cumByVisa, 5);
    }

    result.set(month, {
      cumulativeTotal,
      monthTotal,
      topCountries: lastTopCountries,
      topVisas: lastTopVisas,
    });
  }

  return result;
}

function topN<T extends { count: number }>(m: Map<string, T>, n: number): T[] {
  // Bounded selection without a full sort: we only need the top N. A linear
  // pass with insertion into a tiny ordered window is O(N × n) in the worst
  // case, but n is tiny (5) so it's effectively O(N) and avoids the
  // O(N log N) cost of Array.from(...).sort(...).
  const top: T[] = [];
  for (const v of m.values()) {
    if (top.length < n) {
      top.push({ ...v });
      // Tiny insertion sort to keep `top` ordered desc by count.
      for (let i = top.length - 1; i > 0; i--) {
        if (top[i].count > top[i - 1].count) {
          const t = top[i];
          top[i] = top[i - 1];
          top[i - 1] = t;
        } else break;
      }
      continue;
    }
    if (v.count <= top[n - 1].count) continue;
    top[n - 1] = { ...v };
    for (let i = n - 1; i > 0; i--) {
      if (top[i].count > top[i - 1].count) {
        const t = top[i];
        top[i] = top[i - 1];
        top[i - 1] = t;
      } else break;
    }
  }
  return top;
}

/**
 * Get a precomputed snapshot of cumulative sidebar metrics for a given
 * preset/month. The first call for a preset triggers a one-time O(N) build
 * over the dataset; subsequent calls are O(1) Map lookups.
 *
 * `presetKey` is the same string returned by `presetKeyFor()`.
 */
export function getSnapshot(presetKey: string, currentMonth: string): SidebarSnapshot {
  let cache = _snapshotCache.get(presetKey);
  if (!cache) {
    cache = buildSnapshotsForPreset(presetKey);
    _snapshotCache.set(presetKey, cache);
  }
  return cache.get(currentMonth) ?? EMPTY_SNAPSHOT;
}

/**
 * Translate (filterMode, presetKey, borderView) into the canonical key used
 * by `getSnapshot`. Centralizing this logic keeps the consumer (DataMap)
 * from having to know that "border-entered" is really preset=border + view.
 */
export function presetKeyFor(
  filterMode: "pathway" | "status",
  presetKey: string,
  borderView: "entered" | "stopped"
): string {
  if (filterMode === "pathway" && presetKey === "border") {
    return borderView === "entered" ? "border-entered" : "border-stopped";
  }
  if (filterMode === "status") {
    return `status-${presetKey}`;
  }
  return presetKey;
}
