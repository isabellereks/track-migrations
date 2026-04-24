"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { SETTLEMENT_DESTINATIONS } from "@/lib/geo";
import type { EncounterRecord, Particle, FilterPreset } from "@/lib/types";
import { DOT_STYLES, FILTER_LAYERS } from "@/lib/types";
import type { OriginRegion } from "@/lib/colors";

const MAX_PARTICLES = typeof window !== "undefined" && window.innerWidth < 768 ? 6000 : 15000;

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
}

interface Props {
  data: EncounterRecord[];
  currentMonth: string;
  width: number;
  height: number;
  activePreset: FilterPreset;
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

export default function USMap({ data, currentMonth, width, height, activePreset, onHover }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const prevMonthRef = useRef<string>("");
  const [topoData, setTopoData] = useState<Topology | null>(null);

  const activeLayers = useMemo(() => new Set(FILTER_LAYERS[activePreset]), [activePreset]);
  const activeLayersRef = useRef(activeLayers);
  activeLayersRef.current = activeLayers;
  const presetRef = useRef(activePreset);
  presetRef.current = activePreset;

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

  const spawnParticles = useCallback((month: string) => {
    const monthData = data.filter((d) => d.month === month);
    const newParticles: Particle[] = [];

    for (const record of monthData) {
      const count = Math.max(1, Math.round(record.count / 300));
      const style = DOT_STYLES[record.layer];
      const isBorder = record.layer.startsWith("border-");
      const isLegal = record.layer.startsWith("legal-") || record.layer === "temp-worker" || record.layer === "refugee" || record.layer === "asylum";
      const isOverstay = record.layer === "overstay";
      const isUncounted = record.layer === "uncounted";

      for (let i = 0; i < count; i++) {
        const dest = pickDestination(record.region);
        if (!dest.projected) continue;

        const spreadPx = dest.spread * width * 0.14;
        let tx = 0, ty = 0, inside = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const ja = Math.random() * Math.PI * 2;
          const jd = Math.random() * spreadPx;
          tx = dest.projected![0] + Math.cos(ja) * jd;
          ty = dest.projected![1] + Math.sin(ja) * jd;
          if (isInsideUS(tx, ty)) { inside = true; break; }
        }
        if (!inside) { tx = dest.projected![0]; ty = dest.projected![1]; }

        let sx: number, sy: number;
        if (isBorder) {
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
          entryType: isBorder ? "southern-border" : isOverstay ? "airport" : isLegal ? "airport" : "unknown",
          phase: record.layer === "uncounted" ? "settled" : "incoming",
          hasArrest: false, arrestX: 0, arrestY: 0,
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
    // Remove turned-away dots older than 1s
    const now = performance.now();
    particlesRef.current = particlesRef.current.filter(
      (p) => p.layer !== "border-turnedaway" || now - p.spawnTime < 1200
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
  const prevPresetRef = useRef(activePreset);

  if (prevPresetRef.current !== activePreset) {
    prevPresetRef.current = activePreset;
    settledDirtyRef.current = true;
    fadeFramesRef.current = 20;
  }

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
    const batchMap = new Map<string, { x: number; y: number }[]>();

    const flushBatch = (ctx: CanvasRenderingContext2D) => {
      for (const [key, dots] of batchMap) {
        const [color, alphaStr, radiusStr] = key.split("|");
        ctx.fillStyle = color;
        ctx.globalAlpha = parseFloat(alphaStr);
        const radius = parseFloat(radiusStr);
        ctx.beginPath();
        for (const { x, y } of dots) {
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const addBatch = (fill: string, alpha: number, x: number, y: number, radius: number) => {
      const qa = ((alpha * 20 + 0.5) | 0) / 20;
      const key = `${fill}|${qa}|${radius}`;
      let arr = batchMap.get(key);
      if (!arr) { arr = []; batchMap.set(key, arr); }
      arr.push({ x, y });
    };

    const animate = () => {
      const now = performance.now();
      const particles = particlesRef.current;
      const activeLayersNow = activeLayersRef.current;
      const currentPreset = presetRef.current;
      const isFiltered = currentPreset !== "all";
      const isArrests = currentPreset === "arrests";
      let newSettled = false;

      // Active canvas: incoming + fading turnedaway
      actx.clearRect(0, 0, width, height);
      batchMap.clear();

      for (const p of particles) {
        if (p.phase !== "incoming" && p.layer !== "border-turnedaway") continue;
        const style = DOT_STYLES[p.layer];
        const isActive = activeLayersNow.has(p.layer);

        if (p.layer === "border-turnedaway") {
          if (!isActive) continue;
          const age = now - p.spawnTime;
          const fadeT = Math.max(0, 1 - age / 1000);
          if (fadeT <= 0) continue;
          p.opacity = style.opacity * fadeT;
          addBatch(style.fill, p.opacity, p.x, p.y, style.radius);
          continue;
        }

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
        batchMap.clear();
        const ringBatch: { x: number; y: number; color: string }[] = [];
        let allConverged = true;

        for (const p of particles) {
          if (p.phase !== "settled" && p.phase !== "faded") continue;
          const style = DOT_STYLES[p.layer];
          const isActive = activeLayersNow.has(p.layer);
          const targetOpacity = isActive ? style.opacity : (isFiltered ? 0.06 : style.opacity);

          if (fadeFramesRef.current > 0) {
            p.opacity += (targetOpacity - p.opacity) * 0.15;
          } else {
            p.opacity = targetOpacity;
          }
          if (Math.abs(p.opacity - targetOpacity) > 0.01) allConverged = false;
          if (p.opacity < 0.02) continue;

          const r = isActive && isArrests ? style.radius + 1 : style.radius;
          addBatch(style.fill, p.opacity, p.x, p.y, r);

          if (isActive && isArrests) {
            ringBatch.push({ x: p.x, y: p.y, color: style.fill });
          }
        }
        flushBatch(sctx);

        if (ringBatch.length > 0) {
          sctx.lineWidth = 1;
          sctx.globalAlpha = 0.5;
          for (const { x, y, color } of ringBatch) {
            sctx.beginPath();
            sctx.arc(x, y, 5, 0, Math.PI * 2);
            sctx.strokeStyle = color;
            sctx.stroke();
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
    const hitR = 8, hitR2 = hitR * hitR;
    let closest: Particle | null = null;
    let closestDist = hitR2;

    for (const p of particlesRef.current) {
      if (p.phase === "incoming" || p.phase === "faded" || p.phase === "departing") continue;
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
