"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { SETTLEMENT_DESTINATIONS } from "@/lib/geo";
import type { EncounterRecord, MigrationLayer } from "@/lib/types";
import { DOT_STYLES } from "@/lib/types";
import type { OriginRegion } from "@/lib/colors";

// === Module-level constants ===

const MAX_PARTICLES = typeof window !== "undefined" && window.innerWidth < 768 ? 8000 : 30000;
const STORE_CAPACITY = MAX_PARTICLES * 2;
const COUNT_DIVISOR = 600;

const LAYER_LIST: MigrationLayer[] = [
  "legal-employment",
  "legal-family",
  "legal-diversity",
  "temp-worker",
  "refugee",
  "asylum",
  "border-entered",
  "border-inadmissible",
  "border-turnedaway",
  "overstay",
  "uncounted",
  "ice-arrest",
];
const LAYER_IDX: Record<MigrationLayer, number> = LAYER_LIST.reduce((acc, l, i) => {
  acc[l] = i;
  return acc;
}, {} as Record<MigrationLayer, number>);
const LAYER_BORDER_ENTERED = LAYER_IDX["border-entered"];
const LAYER_BORDER_INADMISSIBLE = LAYER_IDX["border-inadmissible"];
const LAYER_BORDER_TURNEDAWAY = LAYER_IDX["border-turnedaway"];
const LAYER_ICE_ARREST = LAYER_IDX["ice-arrest"];
const LAYER_UNCOUNTED = LAYER_IDX["uncounted"];

// Pre-extract DOT_STYLES into parallel typed arrays for indexed access in
// hot loops. Avoids object property lookups per particle per frame.
const STYLE_FILL: string[] = LAYER_LIST.map((l) => DOT_STYLES[l].fill);
const STYLE_RADIUS: Float32Array = (() => {
  const a = new Float32Array(LAYER_LIST.length);
  for (let i = 0; i < LAYER_LIST.length; i++) a[i] = DOT_STYLES[LAYER_LIST[i]].radius;
  return a;
})();
const STYLE_OPACITY: Float32Array = (() => {
  const a = new Float32Array(LAYER_LIST.length);
  for (let i = 0; i < LAYER_LIST.length; i++) a[i] = DOT_STYLES[LAYER_LIST[i]].opacity;
  return a;
})();

const REGION_LIST: OriginRegion[] = [
  "mexico",
  "central-america",
  "south-america",
  "caribbean",
  "asia",
  "africa",
  "europe",
  "other",
];

const TWO_PI = Math.PI * 2;
const ALPHA_BUCKETS = 21;
const RADIUS_VARIANTS = 2;
const STYLES_COUNT = LAYER_LIST.length * RADIUS_VARIANTS * ALPHA_BUCKETS;

// Hover hit-test radius in CSS px. Also drives the spatial grid's cell size,
// so a query is at most a 3×3 cell window. Single source of truth — both
// the grid build and the hover handler read from this.
const HIT_RADIUS = 8;

// Phase as small ints to fit in Uint8Array.
const PHASE_INCOMING = 0;
const PHASE_SETTLED = 1;
const PHASE_FADED = 2;
const PHASE_DEPARTING = 3;

// Country shape colors. CSS vars (--color-map-neutral, --color-map-stroke) are
// static at build time, so we can render directly to canvas without reading
// them via getComputedStyle.
const COUNTRY_FILL = "#F0F0F0";
const COUNTRY_STROKE = "#DCDCDC";

const FADE_FRAMES = 10; // was 20; halves wasted settled-canvas redraws

const AIRPORT_ENTRIES: Record<string, [number, number]> = {
  asia: [-73.78, 40.64],
  europe: [-73.78, 40.64],
  africa: [-73.78, 40.64],
  "south-america": [-80.29, 25.80],
  caribbean: [-80.29, 25.80],
  mexico: [-97.04, 32.90],
  "central-america": [-95.34, 29.98],
  other: [-87.90, 41.98],
};

const ORIGIN_DIR: Record<string, { angle: number; spread: number }> = {
  mexico:            { angle: Math.PI * 0.5,   spread: 0.4  },
  "central-america": { angle: Math.PI * 0.55,  spread: 0.3  },
  "south-america":   { angle: Math.PI * 0.6,   spread: 0.35 },
  caribbean:         { angle: Math.PI * 0.35,  spread: 0.3  },
  asia:              { angle: Math.PI * 1.0,   spread: 0.4  },
  africa:            { angle: 0,               spread: 0.3  },
  europe:            { angle: -Math.PI * 0.15, spread: 0.3  },
  other:             { angle: Math.PI * 0.5,   spread: Math.PI },
};

// === Public types ===

export interface HoveredDot {
  x: number;
  y: number;
  nationality: string;
  nationalityName: string;
  region: OriginRegion;
  sector: string;
  month: string;
  demographic: string;
  layer: MigrationLayer;
  visaClass?: string;
  visaClassLabel?: string;
  arrestAggregate?: {
    aorName: string;
    totalArrests: number;
    topNationalities: Array<{ name: string; count: number }>;
  };
}

interface ArrestDot {
  x: number;
  y: number;
  radius: number;
  aorKey: string;
  aorName: string;
  totalArrests: number;
  topNationalities: Array<{ name: string; count: number }>;
}

interface Props {
  data: EncounterRecord[];
  currentMonth: string;
  width: number;
  height: number;
  activeLayers: Set<MigrationLayer>;
  borderView?: "entered" | "stopped";
  onHover?: (dot: HoveredDot | null) => void;
}

// === Particle store: struct-of-arrays ===
//
// Iterating `Particle[]` of heavy objects every frame at 60 Hz hashes every
// property access and thrashes the GC. SoA gives us:
//   * linear typed-array reads (cache-friendly)
//   * direct indexed access (no property lookup)
//   * zero allocation per spawn (slots are pre-allocated)
// "Cold" string fields (used only in hover) live in a parallel object array
// to keep the hot arrays small.

interface ColdParticle {
  nationality: string;
  nationalityName: string;
  region: OriginRegion;
  sector: string;
  demographic: string;
  visaClass?: string;
  visaClassLabel?: string;
}

interface ParticleStore {
  capacity: number;
  count: number;
  x: Float32Array;
  y: Float32Array;
  targetX: Float32Array;
  targetY: Float32Array;
  opacity: Float32Array;
  spawnTime: Float64Array;
  layer: Uint8Array;
  phase: Uint8Array;
  birthMonthIdx: Uint16Array;
  cold: (ColdParticle | undefined)[];
}

function createStore(capacity: number): ParticleStore {
  return {
    capacity,
    count: 0,
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    targetX: new Float32Array(capacity),
    targetY: new Float32Array(capacity),
    opacity: new Float32Array(capacity),
    spawnTime: new Float64Array(capacity),
    layer: new Uint8Array(capacity),
    phase: new Uint8Array(capacity),
    birthMonthIdx: new Uint16Array(capacity),
    cold: new Array(capacity),
  };
}

function ensureCapacity(s: ParticleStore, needed: number): void {
  if (needed <= s.capacity) return;
  let cap = s.capacity;
  while (cap < needed) cap *= 2;
  const nx = new Float32Array(cap); nx.set(s.x); s.x = nx;
  const ny = new Float32Array(cap); ny.set(s.y); s.y = ny;
  const ntx = new Float32Array(cap); ntx.set(s.targetX); s.targetX = ntx;
  const nty = new Float32Array(cap); nty.set(s.targetY); s.targetY = nty;
  const nop = new Float32Array(cap); nop.set(s.opacity); s.opacity = nop;
  const nst = new Float64Array(cap); nst.set(s.spawnTime); s.spawnTime = nst;
  const nly = new Uint8Array(cap); nly.set(s.layer); s.layer = nly;
  const nph = new Uint8Array(cap); nph.set(s.phase); s.phase = nph;
  const nbm = new Uint16Array(cap); nbm.set(s.birthMonthIdx); s.birthMonthIdx = nbm;
  s.cold.length = cap;
  s.capacity = cap;
}

// === Component ===

export default function USMap({ data, currentMonth, width, height, activeLayers, borderView = "entered", onHover }: Props) {
  const countryCanvasRef = useRef<HTMLCanvasElement>(null);
  const settledCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitMaskRef = useRef<{ data: Uint8Array; width: number; height: number } | null>(null);
  const prevMonthRef = useRef<string>("");
  const settledDirtyRef = useRef(true);
  const fadeFramesRef = useRef(0);
  const arrestDotsRef = useRef<ArrestDot[]>([]);
  const [topoData, setTopoData] = useState<Topology | null>(null);

  // Spatial grid for hover hit-testing. Bucketing settled particles into an
  // 8 px grid (matching HIT_RADIUS) reduces hover from O(N=30k) per pointer
  // event to ~O(9 cells × ~3 particles each) ≈ O(30). The grid is rebuilt
  // exactly when the settled canvas redraws (i.e. when settled state actually
  // changed), so the cost amortizes against work we were already doing.
  const gridRef = useRef<{
    cellHead: Int32Array;
    cellNext: Int32Array;
    cellSize: number;
    cols: number;
    rows: number;
  } | null>(null);

  // Lazy-init the particle store once. useRef preserves it across renders.
  const storeRef = useRef<ParticleStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createStore(STORE_CAPACITY);
  }

  const activeLayersRef = useRef(activeLayers);
  activeLayersRef.current = activeLayers;
  const borderViewRef = useRef(borderView);
  borderViewRef.current = borderView;

  // Atlas: states-10m.json is 114 KB vs counties-10m.json's 842 KB. We never
  // use county-level data, so loading the smaller atlas is a 7x faster initial
  // parse on the main thread plus much less retained memory.
  useEffect(() => {
    import("us-atlas/states-10m.json").then((mod) => {
      setTopoData(mod.default as unknown as Topology);
    });
  }, []);

  const projection = useMemo(() => {
    return geoAlbersUsa().scale(width * 1.0).translate([width / 2, height / 2]);
  }, [width, height]);

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const states = useMemo(() => {
    if (!topoData) return [];
    const geom = topoData.objects.states as GeometryCollection;
    return topojson.feature(topoData, geom).features;
  }, [topoData]);

  // Path2D objects: cheaper to draw repeatedly than re-parsing string `d`s.
  const statePaths2D = useMemo(() => {
    return states.map((f) => new Path2D(pathGenerator(f) ?? ""));
  }, [states, pathGenerator]);

  // Country canvas — drawn ONCE per state/dimension change. This replaces the
  // 50 SVG <path> elements that previously cost ~10ms of React reconciliation
  // and DOM mounting on every render.
  useEffect(() => {
    const c = countryCanvasRef.current;
    if (!c || statePaths2D.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COUNTRY_FILL;
    ctx.strokeStyle = COUNTRY_STROKE;
    ctx.lineWidth = 0.5;
    for (const p of statePaths2D) {
      ctx.fill(p);
      ctx.stroke(p);
    }
  }, [statePaths2D, width, height]);

  // Hit mask: one-time GPU→CPU readback into a Uint8Array.
  const isInsideUS = useCallback((x: number, y: number): boolean => {
    const m = hitMaskRef.current;
    if (!m) return true;
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= m.width || iy >= m.height) return false;
    return m.data[iy * m.width + ix] === 1;
  }, []);

  useEffect(() => {
    if (statePaths2D.length === 0) return;
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = "#000";
    for (const p of statePaths2D) ctx.fill(p);
    const img = ctx.getImageData(0, 0, width, height);
    const src = img.data;
    const mask = new Uint8Array(width * height);
    for (let i = 0, j = 3; i < mask.length; i++, j += 4) {
      if (src[j] > 0) mask[i] = 1;
    }
    hitMaskRef.current = { data: mask, width, height };
  }, [statePaths2D, width, height]);

  // === Data indexing ===

  const dataByMonth = useMemo(() => {
    const map = new Map<string, EncounterRecord[]>();
    for (const r of data) {
      let arr = map.get(r.month);
      if (!arr) {
        arr = [];
        map.set(r.month, arr);
      }
      arr.push(r);
    }
    return map;
  }, [data]);

  const sortedMonths = useMemo(() => Array.from(dataByMonth.keys()).sort(), [dataByMonth]);

  const monthToIdx = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < sortedMonths.length; i++) m.set(sortedMonths[i], i);
    return m;
  }, [sortedMonths]);

  // Pre-compute every month's snapshot of aggregate arrest dots ONCE per data
  // load. Subsequent month changes are pure O(1) Map lookups instead of
  // walking arrest records every tick.
  const arrestDotsByMonth = useMemo(() => {
    type AorAgg = {
      sector: string;
      lat: number;
      lng: number;
      total: number;
      byNat: Map<string, { name: string; count: number }>;
    };
    const recordsByMonthIdx: EncounterRecord[][] = sortedMonths.map(() => []);
    for (const r of data) {
      if (r.layer !== "ice-arrest") continue;
      const idx = monthToIdx.get(r.month);
      if (idx === undefined) continue;
      recordsByMonthIdx[idx].push(r);
    }

    const byAor = new Map<string, AorAgg>();
    const result = new Map<string, ArrestDot[]>();

    for (let mIdx = 0; mIdx < sortedMonths.length; mIdx++) {
      for (const r of recordsByMonthIdx[mIdx]) {
        if (r.sectorLat === 0 && r.sectorLng === 0) continue;
        const key = r.sector;
        let aor = byAor.get(key);
        if (!aor) {
          aor = {
            sector: r.sector,
            lat: r.sectorLat,
            lng: r.sectorLng,
            total: 0,
            byNat: new Map(),
          };
          byAor.set(key, aor);
        }
        aor.total += r.count;
        const nat = aor.byNat.get(r.nationality);
        if (nat) nat.count += r.count;
        else aor.byNat.set(r.nationality, { name: r.nationalityName, count: r.count });
      }

      let maxCount = 1;
      for (const aor of byAor.values()) {
        if (aor.total > maxCount) maxCount = aor.total;
      }
      const dots: ArrestDot[] = [];
      for (const [key, aor] of byAor) {
        const proj = projection([aor.lng, aor.lat]);
        if (!proj) continue;
        const t = aor.total / maxCount;
        const radius = 6 + t * 22;
        const topNat = Array.from(aor.byNat.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        const prettyName = aor.sector
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        dots.push({
          x: proj[0],
          y: proj[1],
          radius,
          aorKey: key,
          aorName: prettyName,
          totalArrests: aor.total,
          topNationalities: topNat,
        });
      }
      result.set(sortedMonths[mIdx], dots);
    }
    return result;
  }, [data, sortedMonths, monthToIdx, projection]);

  // Cumulative cached destination weights with binary-search picker.
  const destinationCache = useMemo(() => {
    const projected = SETTLEMENT_DESTINATIONS.map((d) => ({
      ...d,
      projected: projection([d.lng, d.lat]) as [number, number] | null,
    })).filter((d): d is typeof d & { projected: [number, number] } => d.projected !== null);

    const byRegion = new Map<string, { dests: typeof projected; cum: Float64Array; total: number }>();
    for (const region of REGION_LIST) {
      const cum = new Float64Array(projected.length);
      let total = 0;
      for (let i = 0; i < projected.length; i++) {
        const d = projected[i];
        const affinity = d.affinities[region] ?? 1;
        total += d.weight * affinity;
        cum[i] = total;
      }
      byRegion.set(region, { dests: projected, cum, total });
    }
    return byRegion;
  }, [projection]);

  const pickDestination = useCallback(
    (region: string) => {
      const entry = destinationCache.get(region) ?? destinationCache.get("other")!;
      const r = Math.random() * entry.total;
      const cum = entry.cum;
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      return entry.dests[lo];
    },
    [destinationCache]
  );

  const airportProjections = useMemo(() => {
    const map: Record<string, [number, number] | null> = {};
    for (const region of Object.keys(AIRPORT_ENTRIES)) {
      map[region] = projection(AIRPORT_ENTRIES[region]) as [number, number] | null;
    }
    return map;
  }, [projection]);

  // === Spawn (writes directly into the SoA store) ===

  const spawnInto = useCallback(
    (store: ParticleStore, month: string) => {
      const monthData = dataByMonth.get(month);
      if (!monthData || monthData.length === 0) return;
      const monthIdx = monthToIdx.get(month) ?? 0;
      const spawnTime = performance.now();
      const arrestSectorCache = new Map<string, [number, number] | null>();

      // Conservative upper bound for sizing — actual particle count may be
      // less because some records may filter out. Doubling capacity if needed
      // is amortized O(1) per particle.
      let estimate = 0;
      for (const record of monthData) {
        estimate += record.count >= COUNT_DIVISOR
          ? ((record.count + COUNT_DIVISOR / 2) / COUNT_DIVISOR) | 0
          : 1;
      }
      ensureCapacity(store, store.count + estimate);

      const X = store.x, Y = store.y, TX = store.targetX, TY = store.targetY;
      const OP = store.opacity, ST = store.spawnTime;
      const LY = store.layer, PH = store.phase, BM = store.birthMonthIdx;
      const COLD = store.cold;

      for (const record of monthData) {
        const count = record.count >= COUNT_DIVISOR
          ? ((record.count + COUNT_DIVISOR / 2) / COUNT_DIVISOR) | 0
          : 1;
        const layer = record.layer;
        const layerI = LAYER_IDX[layer];
        const isBorder =
          layerI === LAYER_BORDER_ENTERED ||
          layerI === LAYER_BORDER_INADMISSIBLE ||
          layerI === LAYER_BORDER_TURNEDAWAY;
        const isLegal =
          layer === "legal-employment" ||
          layer === "legal-family" ||
          layer === "legal-diversity" ||
          layer === "temp-worker" ||
          layer === "refugee" ||
          layer === "asylum";
        const isOverstay = layer === "overstay";
        const isArrest = layerI === LAYER_ICE_ARREST;
        const isUncounted = layerI === LAYER_UNCOUNTED;

        const region = record.region;
        const dir = ORIGIN_DIR[region] ?? ORIGIN_DIR.other;
        const ap = airportProjections[region] ?? airportProjections.other;

        const phase = isUncounted ? PHASE_SETTLED : PHASE_INCOMING;

        let arrestProj: [number, number] | null = null;
        if (isArrest && record.sectorLat !== 0 && record.sectorLng !== 0) {
          const cacheKey = record.sector;
          if (arrestSectorCache.has(cacheKey)) {
            arrestProj = arrestSectorCache.get(cacheKey) ?? null;
          } else {
            arrestProj = projection([record.sectorLng, record.sectorLat]) as [number, number] | null;
            arrestSectorCache.set(cacheKey, arrestProj);
          }
        }

        for (let i = 0; i < count; i++) {
          let tx: number;
          let ty: number;

          if (isArrest && arrestProj) {
            const ja = Math.random() * TWO_PI;
            const jd = Math.random() * 40;
            tx = arrestProj[0] + Math.cos(ja) * jd;
            ty = arrestProj[1] + Math.sin(ja) * jd;
          } else {
            const dest = pickDestination(region);
            const dpx = dest.projected[0];
            const dpy = dest.projected[1];
            const spreadPx = dest.spread * width * 0.14;
            tx = dpx;
            ty = dpy;
            for (let attempt = 0; attempt < 5; attempt++) {
              const ja = Math.random() * TWO_PI;
              const jd = Math.random() * spreadPx;
              const cx = dpx + Math.cos(ja) * jd;
              const cy = dpy + Math.sin(ja) * jd;
              if (isInsideUS(cx, cy)) {
                tx = cx;
                ty = cy;
                break;
              }
            }
          }

          let sx: number;
          let sy: number;
          if (isArrest) {
            sx = tx + (Math.random() - 0.5) * 60;
            sy = ty + (Math.random() - 0.5) * 60;
          } else if (isBorder) {
            const angle = dir.angle + (Math.random() - 0.5) * dir.spread;
            const flyDist = 200 + Math.random() * 300;
            sx = tx + Math.cos(angle) * flyDist;
            sy = ty + Math.sin(angle) * flyDist;
          } else if (isLegal || isOverstay) {
            if (ap) {
              sx = ap[0] + (Math.random() - 0.5) * 40;
              sy = ap[1] - 200 - Math.random() * 200;
            } else {
              sx = tx;
              sy = ty - 300;
            }
          } else {
            sx = tx + (Math.random() - 0.5) * 100;
            sy = ty + (Math.random() - 0.5) * 100;
          }

          const w = store.count++;
          if (w >= store.capacity) {
            // Rare path; ensureCapacity above estimates conservatively.
            ensureCapacity(store, w + 1);
          }
          X[w] = sx;
          Y[w] = sy;
          TX[w] = tx;
          TY[w] = ty;
          OP[w] = 0;
          ST[w] = spawnTime;
          LY[w] = layerI;
          PH[w] = phase;
          BM[w] = monthIdx;
          COLD[w] = {
            nationality: record.nationality,
            nationalityName: record.nationalityName,
            region,
            sector: record.sector,
            demographic: record.demographic,
            visaClass: record.visaClass,
            visaClassLabel: record.visaClassLabel,
          };
        }
      }
    },
    [dataByMonth, monthToIdx, pickDestination, width, isInsideUS, projection, airportProjections]
  );

  // === Resize: linearly re-project particle positions ===
  //
  // Particle positions are cached as projected pixel coords. When the user
  // resizes the window the projection changes, but in-flight particles still
  // hold the old pixel coords — so without this they stay clustered on the
  // pre-resize side of the map while the country shape redraws to the new
  // size. d3.geoAlbersUsa with our `.scale(width).translate([w/2, h/2])` setup
  // produces strictly affine-related results across resizes (scale ratio is
  // newWidth/oldWidth in BOTH axes; only translate differs), so a one-pass
  // linear remap is exact — no per-particle invert+reproject needed.
  const prevDimsRef = useRef<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const prev = prevDimsRef.current;
    prevDimsRef.current = { width, height };
    if (!prev || prev.width === 0 || prev.height === 0) return;
    if (prev.width === width && prev.height === height) return;
    const store = storeRef.current;
    if (!store || store.count === 0) {
      settledDirtyRef.current = true;
      return;
    }
    const s = width / prev.width;
    const oTx = prev.width / 2;
    const oTy = prev.height / 2;
    const nTx = width / 2;
    const nTy = height / 2;
    const X = store.x, Y = store.y, TX = store.targetX, TY = store.targetY;
    const N = store.count;
    for (let i = 0; i < N; i++) {
      X[i] = (X[i] - oTx) * s + nTx;
      Y[i] = (Y[i] - oTy) * s + nTy;
      TX[i] = (TX[i] - oTx) * s + nTx;
      TY[i] = (TY[i] - oTy) * s + nTy;
    }
    settledDirtyRef.current = true;
    fadeFramesRef.current = 0;
  }, [width, height]);

  // === Per-month tick: spawn / rewind / trim ===

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;
    if (currentMonth === prevMonthRef.current) return;

    if (currentMonth < prevMonthRef.current) {
      // Rewind: drop particles born after currentMonth.
      const cutoffIdx = monthToIdx.get(currentMonth) ?? sortedMonths.length;
      compactByMonth(store, cutoffIdx);
    }

    if (currentMonth > prevMonthRef.current || prevMonthRef.current === "") {
      spawnInto(store, currentMonth);
    }

    // Drop expired transients.
    const now = performance.now();
    compactExpired(store, now);

    // Per-layer share trim down to MAX_PARTICLES.
    if (store.count > MAX_PARTICLES) {
      compactToMax(store, MAX_PARTICLES);
    }

    settledDirtyRef.current = true;
    prevMonthRef.current = currentMonth;
  }, [currentMonth, spawnInto, monthToIdx, sortedMonths]);

  // === Layer/borderView change: just mark settled dirty + ease ===

  const prevLayersRef = useRef(activeLayers);
  const prevBorderViewRef = useRef(borderView);
  if (prevLayersRef.current !== activeLayers) {
    prevLayersRef.current = activeLayers;
    settledDirtyRef.current = true;
    fadeFramesRef.current = FADE_FRAMES;
  }
  if (prevBorderViewRef.current !== borderView) {
    prevBorderViewRef.current = borderView;
    settledDirtyRef.current = true;
    fadeFramesRef.current = FADE_FRAMES;
  }

  // === Arrest dots: O(1) lookup from precomputed map ===

  const arrestDots = useMemo(
    () => arrestDotsByMonth.get(currentMonth) ?? [],
    [arrestDotsByMonth, currentMonth]
  );
  useEffect(() => {
    arrestDotsRef.current = arrestDots;
    settledDirtyRef.current = true;
  }, [arrestDots]);

  // === Animation loop ===

  useEffect(() => {
    const store = storeRef.current;
    const activeCanvas = canvasRef.current;
    const sCanvas = settledCanvasRef.current;
    if (!store || !activeCanvas || !sCanvas) return;
    const actx = activeCanvas.getContext("2d");
    const sctx = sCanvas.getContext("2d");
    if (!actx || !sctx) return;
    const dpr = window.devicePixelRatio || 1;

    activeCanvas.width = width * dpr;
    activeCanvas.height = height * dpr;
    sCanvas.width = width * dpr;
    sCanvas.height = height * dpr;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    settledDirtyRef.current = true;

    let animId: number;

    // Persistent batch buffers. Keys are integers
    // (layerI * RADIUS_VARIANTS + rv) * ALPHA_BUCKETS + alphaIdx — no string
    // template allocation per particle.
    const batchData: Float32Array[] = new Array(STYLES_COUNT);
    const batchLen: Int32Array = new Int32Array(STYLES_COUNT);
    const occupiedIndices: number[] = [];

    // Reused per-frame layer-visibility lookup. Allocating once and rewriting
    // saves a small Uint8Array allocation per frame.
    const layerActive = new Uint8Array(LAYER_LIST.length);

    // Spatial grid for settled-particle hover. Cell size matches HIT_RADIUS
    // so a query needs at most a 3×3 cell window.
    const cols = Math.max(1, Math.ceil(width / HIT_RADIUS));
    const rows = Math.max(1, Math.ceil(height / HIT_RADIUS));
    const cellHead = new Int32Array(cols * rows);
    gridRef.current = {
      cellHead,
      cellNext: new Int32Array(store.capacity),
      cellSize: HIT_RADIUS,
      cols,
      rows,
    };

    const rebuildGrid = () => {
      const grid = gridRef.current!;
      // Grow cellNext if the store has expanded since the grid was created.
      // Read length from the live ref (not a closure variable) so subsequent
      // calls don't see a stale capacity and reallocate every frame.
      if (store.capacity > grid.cellNext.length) {
        gridRef.current = {
          cellHead: grid.cellHead,
          cellNext: new Int32Array(store.capacity),
          cellSize: HIT_RADIUS,
          cols,
          rows,
        };
      }
      const g = gridRef.current!;
      g.cellHead.fill(-1);
      const xs = store.x, ys = store.y, phs = store.phase, lys = store.layer;
      const N2 = store.count;
      for (let i = 0; i < N2; i++) {
        const ph = phs[i];
        if (ph !== PHASE_SETTLED && ph !== PHASE_FADED) continue;
        if (lys[i] === LAYER_ICE_ARREST) continue;
        const cx = (xs[i] / HIT_RADIUS) | 0;
        const cy = (ys[i] / HIT_RADIUS) | 0;
        if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
        const idx = cy * cols + cx;
        g.cellNext[i] = g.cellHead[idx];
        g.cellHead[idx] = i;
      }
    };

    const addBatch = (layerI: number, rv: number, alpha: number, x: number, y: number) => {
      const aq = (alpha * 20 + 0.5) | 0;
      if (aq <= 0) return;
      const ai = aq > 20 ? 20 : aq;
      const idx = (layerI * RADIUS_VARIANTS + rv) * ALPHA_BUCKETS + ai;
      const len = batchLen[idx];
      let buf = batchData[idx];
      if (!buf) {
        buf = new Float32Array(256);
        batchData[idx] = buf;
        occupiedIndices.push(idx);
      } else if (len + 2 > buf.length) {
        const next = new Float32Array(buf.length * 2);
        next.set(buf);
        batchData[idx] = next;
        buf = next;
      } else if (len === 0) {
        occupiedIndices.push(idx);
      }
      buf[len] = x;
      buf[len + 1] = y;
      batchLen[idx] = len + 2;
    };

    const flushBatch = (ctx: CanvasRenderingContext2D) => {
      for (let k = 0; k < occupiedIndices.length; k++) {
        const idx = occupiedIndices[k];
        const len = batchLen[idx];
        if (len === 0) continue;
        const ai = idx % ALPHA_BUCKETS;
        const rest = (idx / ALPHA_BUCKETS) | 0;
        const rv = rest % RADIUS_VARIANTS;
        const layerI = (rest / RADIUS_VARIANTS) | 0;
        const radius = rv === 1 ? STYLE_RADIUS[layerI] + 0.7 : STYLE_RADIUS[layerI];
        ctx.fillStyle = STYLE_FILL[layerI];
        ctx.globalAlpha = ai / 20;
        const buf = batchData[idx];
        ctx.beginPath();
        for (let i = 0; i < len; i += 2) {
          const x = buf[i];
          const y = buf[i + 1];
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, TWO_PI);
        }
        ctx.fill();
        batchLen[idx] = 0;
      }
      occupiedIndices.length = 0;
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      const now = performance.now();
      const activeLayersNow = activeLayersRef.current;
      const currentBorderView = borderViewRef.current;
      const isFiltered = activeLayersNow.size < 12;
      const hasBorderLayers =
        activeLayersNow.has("border-entered") && activeLayersNow.has("border-turnedaway");
      const isBorderOnly = hasBorderLayers && activeLayersNow.size <= 3;
      const isArrestMode = activeLayersNow.has("ice-arrest") && activeLayersNow.size === 1;
      let newSettled = false;

      // Refresh per-frame visibility lookup.
      for (let i = 0; i < LAYER_LIST.length; i++) {
        const layer = LAYER_LIST[i];
        let v: number;
        if (isBorderOnly) {
          if (currentBorderView === "entered") {
            v = layer === "border-entered" || layer === "border-inadmissible" ? 1 : 0;
          } else {
            v = layer === "border-turnedaway" || layer === "border-inadmissible" ? 1 : 0;
          }
        } else {
          v = activeLayersNow.has(layer) ? 1 : 0;
        }
        layerActive[i] = v;
      }

      const X = store.x, Y = store.y, TX = store.targetX, TY = store.targetY;
      const OP = store.opacity, ST = store.spawnTime;
      const LY = store.layer, PH = store.phase;
      const N = store.count;

      // Active canvas: incoming + arrests in flight + fading turnedaway.
      actx.clearRect(0, 0, width, height);

      for (let i = 0; i < N; i++) {
        const layerI = LY[i];
        const phaseI = PH[i];
        if (phaseI !== PHASE_INCOMING && phaseI !== PHASE_DEPARTING && layerI !== LAYER_BORDER_TURNEDAWAY) {
          continue;
        }
        const isActive = layerActive[layerI] === 1;

        if (layerI === LAYER_BORDER_TURNEDAWAY) {
          if (!isActive) continue;
          const age = now - ST[i];
          if (isBorderOnly && currentBorderView === "stopped") {
            if (age < 200) {
              const op = (age / 200) * 0.6;
              OP[i] = op;
              addBatch(layerI, 0, op, X[i], Y[i]);
            } else if (age < 600) {
              OP[i] = 0.6;
              addBatch(layerI, 0, 0.6, X[i], Y[i]);
            } else if (age < 1200) {
              const op = 0.6 * (1 - (age - 600) / 600);
              OP[i] = op;
              addBatch(layerI, 0, op, X[i], Y[i]);
            }
          } else {
            const fadeT = 1 - age / 1000;
            if (fadeT <= 0) continue;
            const op = STYLE_OPACITY[layerI] * fadeT;
            OP[i] = op;
            addBatch(layerI, 0, op, X[i], Y[i]);
          }
          continue;
        }

        if (layerI === LAYER_ICE_ARREST) {
          if (!isActive) {
            PH[i] = PHASE_FADED;
            continue;
          }
          if (phaseI === PHASE_DEPARTING) {
            const op = OP[i] - 0.04;
            if (op <= 0) {
              PH[i] = PHASE_FADED;
              continue;
            }
            OP[i] = op;
            addBatch(layerI, 0, op, X[i], Y[i]);
            continue;
          }
          const dx = TX[i] - X[i];
          const dy = TY[i] - Y[i];
          const d2 = dx * dx + dy * dy;
          const cap = STYLE_OPACITY[layerI];
          if (d2 < 9) {
            PH[i] = PHASE_DEPARTING;
            OP[i] = cap * 0.6;
          } else {
            const dist = Math.sqrt(d2);
            const speed = 10 / dist < 0.15 ? 10 / dist : 0.15;
            X[i] += dx * speed;
            Y[i] += dy * speed;
            const next = OP[i] + 0.05;
            OP[i] = next < cap ? next : cap;
          }
          addBatch(layerI, 0, OP[i], X[i], Y[i]);
          continue;
        }

        if (phaseI !== PHASE_INCOMING) continue;

        const dx = TX[i] - X[i];
        const dy = TY[i] - Y[i];
        const d2 = dx * dx + dy * dy;
        const cap = STYLE_OPACITY[layerI];
        if (d2 < 2.25) {
          X[i] = TX[i];
          Y[i] = TY[i];
          PH[i] = PHASE_SETTLED;
          const op = isActive ? cap : 0.06;
          OP[i] = op;
          newSettled = true;
          addBatch(layerI, 0, op, X[i], Y[i]);
        } else {
          const dist = Math.sqrt(d2);
          const speed = 8 / dist < 0.12 ? 8 / dist : 0.12;
          X[i] += dx * speed;
          Y[i] += dy * speed;
          const target = isActive ? cap : 0.06;
          const next = OP[i] + 0.06;
          const op = next < target ? next : target;
          OP[i] = op;
          addBatch(layerI, 1, op, X[i], Y[i]);
        }
      }
      flushBatch(actx);

      if (newSettled) {
        settledDirtyRef.current = true;
        if (fadeFramesRef.current <= 0) fadeFramesRef.current = 1;
      }

      const needsSettledRedraw = settledDirtyRef.current || fadeFramesRef.current > 0;

      if (needsSettledRedraw) {
        sctx.clearRect(0, 0, width, height);
        let allConverged = true;
        const showArrestDots = activeLayersNow.has("ice-arrest");
        const fading = fadeFramesRef.current > 0;

        for (let i = 0; i < N; i++) {
          const phaseI = PH[i];
          if (phaseI !== PHASE_SETTLED && phaseI !== PHASE_FADED) continue;
          const layerI = LY[i];
          if (layerI === LAYER_ICE_ARREST) continue;
          const isActive = layerActive[layerI] === 1;
          const baseCap = STYLE_OPACITY[layerI];

          let target: number;
          if (isBorderOnly) {
            if (isActive) {
              target = layerI === LAYER_BORDER_INADMISSIBLE ? baseCap * 0.5 : baseCap;
            } else {
              target = 0.03;
            }
          } else {
            target = isActive ? baseCap : isFiltered ? 0.06 : baseCap;
          }

          let op: number;
          if (fading) {
            op = OP[i] + (target - OP[i]) * 0.15;
            OP[i] = op;
            const diff = op - target;
            if (diff > 0.01 || diff < -0.01) allConverged = false;
          } else {
            OP[i] = target;
            op = target;
          }
          if (op < 0.02) continue;
          addBatch(layerI, 0, op, X[i], Y[i]);
        }
        flushBatch(sctx);

        if (showArrestDots) {
          const dots = arrestDotsRef.current;
          if (dots.length > 0) {
            const arrestAlpha = isArrestMode ? 0.7 : 0.3;
            sctx.fillStyle = "#3A6BD4";

            sctx.globalAlpha = arrestAlpha * 0.25;
            sctx.beginPath();
            for (const dot of dots) {
              sctx.moveTo(dot.x + dot.radius, dot.y);
              sctx.arc(dot.x, dot.y, dot.radius, 0, TWO_PI);
            }
            sctx.fill();

            sctx.globalAlpha = arrestAlpha * 0.5;
            sctx.beginPath();
            for (const dot of dots) {
              const r = dot.radius * 0.6;
              sctx.moveTo(dot.x + r, dot.y);
              sctx.arc(dot.x, dot.y, r, 0, TWO_PI);
            }
            sctx.fill();

            sctx.globalAlpha = arrestAlpha;
            sctx.beginPath();
            for (const dot of dots) {
              const r = dot.radius * 0.3;
              sctx.moveTo(dot.x + r, dot.y);
              sctx.arc(dot.x, dot.y, r, 0, TWO_PI);
            }
            sctx.fill();
            sctx.globalAlpha = 1;
          }
        }

        if (fadeFramesRef.current > 0) fadeFramesRef.current--;
        if (allConverged && fadeFramesRef.current <= 0) settledDirtyRef.current = false;

        // Rebuild the spatial hover index in the same pass that rebuilt the
        // settled canvas. This piggybacks on existing throttling
        // (settledDirtyRef / fadeFramesRef), so the grid stays in sync with
        // what the user actually sees without rebuilding every frame.
        rebuildGrid();
      }

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [width, height]);

  // === Hover ===

  const hoverThrottleRef = useRef(0);
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onHover) return;
      const now = performance.now();
      if (now - hoverThrottleRef.current < 80) return;
      hoverThrottleRef.current = now;

      const store = storeRef.current;
      if (!store) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (activeLayers.has("ice-arrest")) {
        for (const dot of arrestDotsRef.current) {
          const dx = dot.x - mx;
          const dy = dot.y - my;
          if (dx * dx + dy * dy < dot.radius * dot.radius) {
            onHover({
              x: e.clientX,
              y: e.clientY,
              nationality: "",
              nationalityName: dot.aorName,
              region: "other" as OriginRegion,
              sector: dot.aorKey,
              month: "",
              demographic: "",
              layer: "ice-arrest",
              arrestAggregate: {
                aorName: dot.aorName,
                totalArrests: dot.totalArrests,
                topNationalities: dot.topNationalities,
              },
            });
            return;
          }
        }
      }

      // Grid and fallback agree on the same predicate: settled OR faded
      // particles, excluding ice-arrest (handled by aggregate dots above) and
      // any layer not in the current activeLayers. Faded particles stay
      // visible (just dimmed) after a layer toggle, so they should remain
      // hoverable while on screen.
      const isHoverCandidate = (i: number): boolean => {
        const phaseI = PH[i];
        if (phaseI !== PHASE_SETTLED && phaseI !== PHASE_FADED) return false;
        const layerI = LY[i];
        if (layerI === LAYER_ICE_ARREST) return false;
        return activeLayers.has(LAYER_LIST[layerI]);
      };

      const hitR2 = HIT_RADIUS * HIT_RADIUS;
      let bestI = -1;
      let bestDist = hitR2;
      const X = store.x, Y = store.y, LY = store.layer, PH = store.phase;

      // Spatial-grid hit-test. Falls back to a linear scan only if the grid
      // hasn't been built yet (e.g. before any settled redraw).
      const grid = gridRef.current;
      if (grid) {
        const { cellHead, cellNext, cellSize, cols, rows } = grid;
        const minCx = Math.max(0, ((mx - HIT_RADIUS) / cellSize) | 0);
        const maxCx = Math.min(cols - 1, ((mx + HIT_RADIUS) / cellSize) | 0);
        const minCy = Math.max(0, ((my - HIT_RADIUS) / cellSize) | 0);
        const maxCy = Math.min(rows - 1, ((my + HIT_RADIUS) / cellSize) | 0);
        for (let cy = minCy; cy <= maxCy; cy++) {
          for (let cx = minCx; cx <= maxCx; cx++) {
            let i = cellHead[cy * cols + cx];
            while (i !== -1) {
              if (isHoverCandidate(i)) {
                const dx = X[i] - mx;
                const dy = Y[i] - my;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestDist) {
                  bestDist = d2;
                  bestI = i;
                }
              }
              i = cellNext[i];
            }
          }
        }
      } else {
        const N = store.count;
        for (let i = 0; i < N; i++) {
          if (!isHoverCandidate(i)) continue;
          const dx = X[i] - mx;
          if (dx > HIT_RADIUS || dx < -HIT_RADIUS) continue;
          const dy = Y[i] - my;
          if (dy > HIT_RADIUS || dy < -HIT_RADIUS) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestDist) {
            bestDist = d2;
            bestI = i;
          }
        }
      }

      if (bestI >= 0) {
        const cold = store.cold[bestI];
        if (cold) {
          const monthIdx = store.birthMonthIdx[bestI];
          onHover({
            x: e.clientX,
            y: e.clientY,
            nationality: cold.nationality,
            nationalityName: cold.nationalityName,
            region: cold.region,
            sector: cold.sector,
            month: sortedMonths[monthIdx] ?? "",
            demographic: cold.demographic,
            layer: LAYER_LIST[store.layer[bestI]],
            visaClass: cold.visaClass,
            visaClassLabel: cold.visaClassLabel,
          });
        }
      } else {
        onHover(null);
      }
    },
    [onHover, activeLayers, sortedMonths]
  );

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  // === Render ===
  //
  // No SVG: country, settled particles, and active particles each get their
  // own canvas. The country canvas is drawn once per dimension change, the
  // settled canvas is throttled redraw-on-dirty, and the top canvas paints
  // every frame. This drops the React render to 4 DOM nodes.

  return (
    <div
      className="relative"
      style={{ width, height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label="Map of the United States showing migration patterns"
    >
      <canvas
        ref={countryCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width, height }}
        aria-hidden="true"
      />
      <canvas
        ref={settledCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width, height }}
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width, height }}
        aria-hidden="true"
      />
    </div>
  );
}

// === Store helpers (module scope; used only inside the per-month effect) ===

function compactByMonth(s: ParticleStore, cutoffMonthIdx: number): void {
  let w = 0;
  const x = s.x, y = s.y, tx = s.targetX, ty = s.targetY, op = s.opacity;
  const st = s.spawnTime, ly = s.layer, ph = s.phase, bm = s.birthMonthIdx;
  const cd = s.cold;
  const n = s.count;
  for (let i = 0; i < n; i++) {
    if (bm[i] <= cutoffMonthIdx) {
      if (w !== i) {
        x[w] = x[i]; y[w] = y[i]; tx[w] = tx[i]; ty[w] = ty[i]; op[w] = op[i];
        st[w] = st[i]; ly[w] = ly[i]; ph[w] = ph[i]; bm[w] = bm[i];
        cd[w] = cd[i];
      }
      w++;
    }
  }
  for (let i = w; i < n; i++) cd[i] = undefined;
  s.count = w;
}

function compactExpired(s: ParticleStore, now: number): void {
  let w = 0;
  const x = s.x, y = s.y, tx = s.targetX, ty = s.targetY, op = s.opacity;
  const st = s.spawnTime, ly = s.layer, ph = s.phase, bm = s.birthMonthIdx;
  const cd = s.cold;
  const n = s.count;
  for (let i = 0; i < n; i++) {
    const layerI = ly[i];
    const phaseI = ph[i];
    if (layerI === LAYER_BORDER_TURNEDAWAY && now - st[i] >= 1200) continue;
    if (layerI === LAYER_ICE_ARREST && phaseI === PHASE_FADED) continue;
    if (w !== i) {
      x[w] = x[i]; y[w] = y[i]; tx[w] = tx[i]; ty[w] = ty[i]; op[w] = op[i];
      st[w] = st[i]; ly[w] = ly[i]; ph[w] = ph[i]; bm[w] = bm[i];
      cd[w] = cd[i];
    }
    w++;
  }
  for (let i = w; i < n; i++) cd[i] = undefined;
  s.count = w;
}

function compactToMax(s: ParticleStore, maxCount: number): void {
  const total = s.count;
  const excess = total - maxCount;
  if (excess <= 0) return;

  // Drop a per-layer share of the OLDEST particles.
  const layerCounts = new Uint32Array(LAYER_LIST.length);
  for (let i = 0; i < total; i++) layerCounts[s.layer[i]]++;
  const drop = new Uint32Array(LAYER_LIST.length);
  for (let l = 0; l < LAYER_LIST.length; l++) {
    drop[l] = ((excess * layerCounts[l]) / total) | 0;
  }

  let w = 0;
  const x = s.x, y = s.y, tx = s.targetX, ty = s.targetY, op = s.opacity;
  const st = s.spawnTime, ly = s.layer, ph = s.phase, bm = s.birthMonthIdx;
  const cd = s.cold;
  for (let i = 0; i < total; i++) {
    const l = ly[i];
    if (drop[l] > 0) {
      drop[l]--;
      continue;
    }
    if (w !== i) {
      x[w] = x[i]; y[w] = y[i]; tx[w] = tx[i]; ty[w] = ty[i]; op[w] = op[i];
      st[w] = st[i]; ly[w] = ly[i]; ph[w] = ph[i]; bm[w] = bm[i];
      cd[w] = cd[i];
    }
    w++;
  }
  for (let i = w; i < total; i++) cd[i] = undefined;
  s.count = w;
}
