"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { SETTLEMENT_DESTINATIONS } from "@/lib/geo";
import type { EncounterRecord, Particle, MigrationLayer } from "@/lib/types";
import { DOT_STYLES } from "@/lib/types";
import type { OriginRegion } from "@/lib/colors";

const MAX_PARTICLES = typeof window !== "undefined" && window.innerWidth < 768 ? 8000 : 30000;
const COUNT_DIVISOR = 600;

export interface HoveredDot {
  x: number;
  y: number;
  nationality: string;
  nationalityName: string;
  region: OriginRegion;
  sector: string;
  month: string;
  demographic: string;
  layer: import("@/lib/types").MigrationLayer;
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

export default function USMap({ data, currentMonth, width, height, activeLayers, borderView = "entered", onHover }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const prevMonthRef = useRef<string>("");
  const [topoData, setTopoData] = useState<Topology | null>(null);

  const activeLayersRef = useRef(activeLayers);
  activeLayersRef.current = activeLayers;
  const borderViewRef = useRef(borderView);
  borderViewRef.current = borderView;

  useEffect(() => {
    import("us-atlas/counties-10m.json").then((mod) => {
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

  const isInsideUS = useCallback((x: number, y: number): boolean => {
    const ctx = hitCanvasRef.current?.getContext("2d");
    if (!ctx) return true;
    const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    return pixel[3] > 0;
  }, []);

  useEffect(() => {
    if (states.length === 0) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    for (const feature of states) {
      const p = new Path2D(pathGenerator(feature) ?? "");
      ctx.fill(p);
    }
    hitCanvasRef.current = offscreen;
  }, [states, width, height, pathGenerator]);

  const projectedDestinations = useMemo(() => {
    return SETTLEMENT_DESTINATIONS.map((d) => ({
      ...d,
      projected: projection([d.lng, d.lat]) as [number, number] | null,
    })).filter((d) => d.projected !== null);
  }, [projection]);

  const pickDestination = useCallback((region: string) => {
    const weights = projectedDestinations.map((d) => {
      const affinity = d.affinities[region] ?? 1;
      return d.weight * affinity;
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return projectedDestinations[i];
    }
    return projectedDestinations[0];
  }, [projectedDestinations]);

  const arrestDotsRef = useRef<ArrestDot[]>([]);

  const arrestDots = useMemo(() => {
    const arrestData = data.filter((d) => d.layer === "ice-arrest" && d.month <= currentMonth);
    const byAor = new Map<string, { sector: string; lat: number; lng: number; total: number; byNat: Map<string, { name: string; count: number }> }>();
    for (const r of arrestData) {
      if (r.sectorLat === 0 && r.sectorLng === 0) continue;
      const key = r.sector;
      let aor = byAor.get(key);
      if (!aor) { aor = { sector: r.sector, lat: r.sectorLat, lng: r.sectorLng, total: 0, byNat: new Map() }; byAor.set(key, aor); }
      aor.total += r.count;
      const nat = aor.byNat.get(r.nationality);
      if (nat) nat.count += r.count; else aor.byNat.set(r.nationality, { name: r.nationalityName, count: r.count });
    }
    const maxCount = Math.max(1, ...Array.from(byAor.values()).map((a) => a.total));
    const dots: ArrestDot[] = [];
    for (const [key, aor] of byAor) {
      const proj = projection([aor.lng, aor.lat]);
      if (!proj) continue;
      const t = aor.total / maxCount;
      const radius = 6 + t * 22;
      const topNat = Array.from(aor.byNat.values()).sort((a, b) => b.count - a.count).slice(0, 5);
      const prettyName = aor.sector.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      dots.push({ x: proj[0], y: proj[1], radius, aorKey: key, aorName: prettyName, totalArrests: aor.total, topNationalities: topNat });
    }
    return dots;
  }, [data, currentMonth, projection]);

  const spawnParticles = useCallback((month: string) => {
    const monthData = data.filter((d) => d.month === month);
    const newParticles: Particle[] = [];

    for (const record of monthData) {
      const count = Math.max(1, Math.round(record.count / COUNT_DIVISOR));
      const style = DOT_STYLES[record.layer];
      const isBorder = record.layer.startsWith("border-");
      const isLegal = record.layer.startsWith("legal-") || record.layer === "temp-worker" || record.layer === "refugee" || record.layer === "asylum";
      const isOverstay = record.layer === "overstay";
      const isUncounted = record.layer === "uncounted";
      const isArrest = record.layer === "ice-arrest";

      for (let i = 0; i < count; i++) {
        let tx: number, ty: number;

        if (isArrest && record.sectorLat !== 0 && record.sectorLng !== 0) {
          const proj = projection([record.sectorLng, record.sectorLat]);
          if (proj) {
            const ja = Math.random() * Math.PI * 2;
            const jd = Math.random() * 40;
            tx = proj[0] + Math.cos(ja) * jd;
            ty = proj[1] + Math.sin(ja) * jd;
          } else {
            const dest = pickDestination(record.region);
            if (!dest.projected) continue;
            tx = dest.projected[0]; ty = dest.projected[1];
          }
        } else {
          const dest = pickDestination(record.region);
          if (!dest.projected) continue;

          const spreadPx = dest.spread * width * 0.14;
          let inside = false;
          tx = 0; ty = 0;
          for (let attempt = 0; attempt < 5; attempt++) {
            const ja = Math.random() * Math.PI * 2;
            const jd = Math.random() * spreadPx;
            tx = dest.projected![0] + Math.cos(ja) * jd;
            ty = dest.projected![1] + Math.sin(ja) * jd;
            if (isInsideUS(tx, ty)) { inside = true; break; }
          }
          if (!inside) { tx = dest.projected![0]; ty = dest.projected![1]; }
        }

        let sx: number, sy: number;
        if (isArrest) {
          sx = tx + (Math.random() - 0.5) * 60;
          sy = ty + (Math.random() - 0.5) * 60;
        } else if (isBorder) {
          const dir = ORIGIN_DIR[record.region] ?? ORIGIN_DIR.other;
          const angle = dir.angle + (Math.random() - 0.5) * dir.spread;
          const flyDist = 200 + Math.random() * 300;
          sx = tx + Math.cos(angle) * flyDist;
          sy = ty + Math.sin(angle) * flyDist;
        } else if (isLegal || isOverstay) {
          const airport = AIRPORT_ENTRIES[record.region] ?? AIRPORT_ENTRIES.other;
          const ap = projection(airport);
          if (ap) { sx = ap[0] + (Math.random() - 0.5) * 40; sy = ap[1] - 200 - Math.random() * 200; }
          else { sx = tx; sy = ty - 300; }
        } else {
          sx = tx + (Math.random() - 0.5) * 100;
          sy = ty + (Math.random() - 0.5) * 100;
        }

        newParticles.push({
          x: sx, y: sy, targetX: tx, targetY: ty,
          opacity: 0, birthMonth: month, settled: false,
          layer: record.layer,
          nationality: record.nationality,
          nationalityName: record.nationalityName,
          region: record.region, sector: record.sector,
          demographic: record.demographic,
          visaClass: record.visaClass,
          visaClassLabel: record.visaClassLabel,
          entryType: isArrest ? "arrest" : isBorder ? "southern-border" : isOverstay ? "airport" : isLegal ? "airport" : "unknown",
          phase: record.layer === "uncounted" ? "settled" : "incoming",
          hasArrest: isArrest, arrestX: isArrest ? tx : 0, arrestY: isArrest ? ty : 0,
          crossingX: tx, crossingY: ty,
          migrationT: 0, migrationDelay: 0,
          migrationDuration: 0,
          trailDrawn: false,
          spawnTime: performance.now(),
        });
      }
    }

    return newParticles;
  }, [data, pickDestination, width, isInsideUS, projection]);

  useEffect(() => {
    if (currentMonth === prevMonthRef.current) return;
    if (currentMonth < prevMonthRef.current) {
      particlesRef.current = particlesRef.current.filter((p) => p.birthMonth <= currentMonth);
    }
    if (currentMonth > prevMonthRef.current || prevMonthRef.current === "") {
      const newP = spawnParticles(currentMonth);
      particlesRef.current = [...particlesRef.current, ...newP];
    }
    // Remove expired transient particles
    const now = performance.now();
    particlesRef.current = particlesRef.current.filter(
      (p) => {
        if (p.layer === "border-turnedaway" && now - p.spawnTime >= 1200) return false;
        if (p.layer === "ice-arrest" && p.phase === "faded") return false;
        return true;
      }
    );
    if (particlesRef.current.length > MAX_PARTICLES) {
      const byLayer = new Map<string, Particle[]>();
      for (const p of particlesRef.current) {
        let arr = byLayer.get(p.layer);
        if (!arr) { arr = []; byLayer.set(p.layer, arr); }
        arr.push(p);
      }
      const excess = particlesRef.current.length - MAX_PARTICLES;
      let removed = 0;
      const totalParticles = particlesRef.current.length;
      const keep = new Set<Particle>();
      for (const [, layerParticles] of byLayer) {
        const layerShare = layerParticles.length / totalParticles;
        const layerTrim = Math.floor(excess * layerShare);
        for (let i = layerTrim; i < layerParticles.length; i++) {
          keep.add(layerParticles[i]);
        }
        removed += layerTrim;
      }
      particlesRef.current = particlesRef.current.filter((p) => keep.has(p));
    }
    settledDirtyRef.current = true;
    prevMonthRef.current = currentMonth;
  }, [currentMonth, spawnParticles]);

  const settledCanvasRef = useRef<HTMLCanvasElement>(null);
  const settledDirtyRef = useRef(true);
  const fadeFramesRef = useRef(0);
  const prevLayersRef = useRef(activeLayers);
  const prevBorderViewRef = useRef(borderView);

  if (prevLayersRef.current !== activeLayers) {
    prevLayersRef.current = activeLayers;
    settledDirtyRef.current = true;
    fadeFramesRef.current = 20;
  }
  if (prevBorderViewRef.current !== borderView) {
    prevBorderViewRef.current = borderView;
    settledDirtyRef.current = true;
    fadeFramesRef.current = 20;
  }

  useEffect(() => { arrestDotsRef.current = arrestDots; settledDirtyRef.current = true; }, [arrestDots]);

  // Animation loop — two canvases: settled (static) + active (per-frame)
  useEffect(() => {
    const activeCanvas = canvasRef.current;
    const sCanvas = settledCanvasRef.current;
    if (!activeCanvas || !sCanvas) return;
    const actx = activeCanvas.getContext("2d");
    const sctx = sCanvas.getContext("2d");
    if (!actx || !sctx) return;
    const dpr = window.devicePixelRatio || 1;

    activeCanvas.width = width * dpr; activeCanvas.height = height * dpr;
    sCanvas.width = width * dpr; sCanvas.height = height * dpr;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    settledDirtyRef.current = true;

    let animId: number;

    // Pre-allocated batch buffer: [x, y, x, y, ...] per style key
    const batchBuf = new Map<string, { data: Float32Array; len: number }>();
    const getBuf = (key: string) => {
      let b = batchBuf.get(key);
      if (!b) { b = { data: new Float32Array(4096), len: 0 }; batchBuf.set(key, b); }
      return b;
    };

    const flushBatch = (ctx: CanvasRenderingContext2D) => {
      for (const [key, buf] of batchBuf) {
        if (buf.len === 0) continue;
        const [color, alphaStr, radiusStr] = key.split("|");
        ctx.fillStyle = color;
        ctx.globalAlpha = +alphaStr;
        const radius = +radiusStr;
        const d = buf.data;
        const n = buf.len;
        ctx.beginPath();
        for (let i = 0; i < n; i += 2) {
          const x = d[i], y = d[i + 1];
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
        ctx.fill();
        buf.len = 0;
      }
      ctx.globalAlpha = 1;
    };

    const addBatch = (fill: string, alpha: number, x: number, y: number, radius: number) => {
      const qa = ((alpha * 20 + 0.5) | 0) / 20;
      const key = `${fill}|${qa}|${radius}`;
      const buf = getBuf(key);
      if (buf.len + 2 > buf.data.length) {
        const next = new Float32Array(buf.data.length * 2);
        next.set(buf.data);
        buf.data = next;
      }
      buf.data[buf.len++] = x;
      buf.data[buf.len++] = y;
    };

    const animate = () => {
      const now = performance.now();
      const particles = particlesRef.current;
      const activeLayersNow = activeLayersRef.current;
      const currentBorderView = borderViewRef.current;
      const isFiltered = activeLayersNow.size < 12;
      const hasBorderLayers = activeLayersNow.has("border-entered") && activeLayersNow.has("border-turnedaway");
      const isBorderOnly = hasBorderLayers && activeLayersNow.size <= 3;
      const isArrestMode = activeLayersNow.has("ice-arrest") && activeLayersNow.size === 1;
      let newSettled = false;

      const isBorderVisible = (layer: string) => {
        if (!isBorderOnly) return activeLayersNow.has(layer as import("@/lib/types").MigrationLayer);
        if (currentBorderView === "entered") {
          return layer === "border-entered" || layer === "border-inadmissible";
        }
        return layer === "border-turnedaway" || layer === "border-inadmissible";
      };

      // Active canvas: incoming + fading turnedaway
      actx.clearRect(0, 0, width, height);
      for (const buf of batchBuf.values()) buf.len = 0;

      for (const p of particles) {
        if (p.phase !== "incoming" && p.phase !== "departing" && p.layer !== "border-turnedaway") continue;
        const style = DOT_STYLES[p.layer];
        const isActive = isBorderOnly ? isBorderVisible(p.layer) : activeLayersNow.has(p.layer);

        if (p.layer === "border-turnedaway") {
          if (!isActive) continue;
          const age = now - p.spawnTime;
          if (isBorderOnly && currentBorderView === "stopped") {
            if (age < 200) {
              p.opacity = (age / 200) * 0.6;
              const r = style.radius * (0.8 + 0.2 * (age / 200));
              addBatch(style.fill, p.opacity, p.x, p.y, r);
            } else if (age < 600) {
              p.opacity = 0.6;
              addBatch(style.fill, p.opacity, p.x, p.y, style.radius);
            } else if (age < 1200) {
              p.opacity = 0.6 * (1 - (age - 600) / 600);
              addBatch(style.fill, p.opacity, p.x, p.y, style.radius);
            }
          } else {
            const fadeT = Math.max(0, 1 - age / 1000);
            if (fadeT <= 0) continue;
            p.opacity = style.opacity * fadeT;
            addBatch(style.fill, p.opacity, p.x, p.y, style.radius);
          }
          continue;
        }

        // Arrest particles: fly in then fade out (absorbed into aggregate dot)
        if (p.layer === "ice-arrest") {
          if (!isActive) { p.phase = "faded"; continue; }
          if (p.phase === "departing") {
            p.opacity -= 0.04;
            if (p.opacity <= 0) { p.phase = "faded"; continue; }
            addBatch(style.fill, p.opacity, p.x, p.y, style.radius);
            continue;
          }
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 3) {
            p.phase = "departing";
            p.opacity = style.opacity * 0.6;
          } else {
            const speed = Math.min(0.15, 10 / dist);
            p.x += dx * speed; p.y += dy * speed;
            p.opacity = Math.min(style.opacity, p.opacity + 0.05);
          }
          addBatch(style.fill, p.opacity, p.x, p.y, style.radius);
          continue;
        }

        if (p.phase !== "incoming") continue;

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1.5) {
          p.x = p.targetX; p.y = p.targetY;
          p.settled = true; p.phase = "settled";
          p.opacity = isActive ? style.opacity : 0.06;
          newSettled = true;
        } else {
          const speed = Math.min(0.12, 8 / dist);
          p.x += dx * speed; p.y += dy * speed;
          p.opacity = Math.min(isActive ? style.opacity : 0.06, p.opacity + 0.06);
        }
        addBatch(style.fill, p.opacity, p.x, p.y, p.settled ? style.radius : style.radius + 0.7);
      }
      flushBatch(actx);

      // Settled canvas: only redraw when dirty
      if (newSettled) {
        settledDirtyRef.current = true;
        if (fadeFramesRef.current <= 0) fadeFramesRef.current = 1;
      }

      const needsSettledRedraw = settledDirtyRef.current || fadeFramesRef.current > 0;

      if (needsSettledRedraw) {
        sctx.clearRect(0, 0, width, height);
        for (const buf of batchBuf.values()) buf.len = 0;
        let allConverged = true;
        const showArrestDots = activeLayersNow.has("ice-arrest");

        for (const p of particles) {
          if (p.phase !== "settled" && p.phase !== "faded") continue;
          if (p.layer === "ice-arrest") continue;
          const style = DOT_STYLES[p.layer];
          const isActive = isBorderOnly ? isBorderVisible(p.layer) : activeLayersNow.has(p.layer);

          let targetOpacity: number;
          if (isBorderOnly) {
            if (isActive) {
              targetOpacity = p.layer === "border-inadmissible" ? style.opacity * 0.5 : style.opacity;
            } else {
              targetOpacity = 0.03;
            }
          } else {
            targetOpacity = isActive ? style.opacity : (isFiltered ? 0.06 : style.opacity);
          }

          if (fadeFramesRef.current > 0) {
            p.opacity += (targetOpacity - p.opacity) * 0.15;
          } else {
            p.opacity = targetOpacity;
          }
          if (Math.abs(p.opacity - targetOpacity) > 0.01) allConverged = false;
          if (p.opacity < 0.02) continue;

          addBatch(style.fill, p.opacity, p.x, p.y, style.radius);
        }
        flushBatch(sctx);

        // Aggregate arrest dots: big blue circles
        if (showArrestDots) {
          const dots = arrestDotsRef.current;
          const arrestAlpha = isArrestMode ? 0.7 : 0.3;
          for (const dot of dots) {
            sctx.beginPath();
            sctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            sctx.fillStyle = "#3A6BD4";
            sctx.globalAlpha = arrestAlpha * 0.25;
            sctx.fill();

            sctx.beginPath();
            sctx.arc(dot.x, dot.y, dot.radius * 0.6, 0, Math.PI * 2);
            sctx.globalAlpha = arrestAlpha * 0.5;
            sctx.fill();

            sctx.beginPath();
            sctx.arc(dot.x, dot.y, dot.radius * 0.3, 0, Math.PI * 2);
            sctx.globalAlpha = arrestAlpha;
            sctx.fill();
          }
          sctx.globalAlpha = 1;
        }

        if (fadeFramesRef.current > 0) fadeFramesRef.current--;
        if (allConverged && fadeFramesRef.current <= 0) settledDirtyRef.current = false;
      }

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [width, height]);

  const hoverThrottleRef = useRef(0);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onHover) return;
    const now = performance.now();
    if (now - hoverThrottleRef.current < 80) return;
    hoverThrottleRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check aggregate arrest dots first
    if (activeLayers.has("ice-arrest")) {
      for (const dot of arrestDotsRef.current) {
        const dx = dot.x - mx, dy = dot.y - my;
        if (dx * dx + dy * dy < dot.radius * dot.radius) {
          onHover({
            x: e.clientX, y: e.clientY,
            nationality: "", nationalityName: dot.aorName,
            region: "other" as OriginRegion, sector: dot.aorKey,
            month: "", demographic: "",
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

    const hitR = 8, hitR2 = hitR * hitR;
    let closest: Particle | null = null;
    let closestDist = hitR2;

    for (const p of particlesRef.current) {
      if (p.phase === "incoming" || p.phase === "faded" || p.phase === "departing") continue;
      if (p.layer === "ice-arrest") continue;
      if (!activeLayers.has(p.layer)) continue;
      const dx = p.x - mx;
      if (dx > hitR || dx < -hitR) continue;
      const dy = p.y - my;
      if (dy > hitR || dy < -hitR) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 < closestDist) { closestDist = d2; closest = p; }
    }

    if (closest) {
      onHover({
        x: e.clientX, y: e.clientY,
        nationality: closest.nationality,
        nationalityName: closest.nationalityName,
        region: closest.region, sector: closest.sector,
        month: closest.birthMonth, demographic: closest.demographic,
        layer: closest.layer,
        visaClass: closest.visaClass,
        visaClassLabel: closest.visaClassLabel,
      });
    } else {
      onHover(null);
    }
  }, [onHover, activeLayers]);

  const handleMouseLeave = useCallback(() => { onHover?.(null); }, [onHover]);

  return (
    <div className="relative" style={{ width, height }}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg ref={svgRef} width={width} height={height} className="absolute inset-0"
        role="img" aria-label="Map of the United States showing migration patterns">
        {states.map((feature, i) => (
          <path key={i} d={pathGenerator(feature) ?? ""}
            fill="var(--color-map-neutral)" stroke="var(--color-map-stroke)" strokeWidth={0.5} />
        ))}
      </svg>
      <canvas ref={settledCanvasRef} className="absolute inset-0 pointer-events-none"
        style={{ width, height }} aria-hidden="true" />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none"
        style={{ width, height }} aria-hidden="true" />
    </div>
  );
}
