"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { REGION_HEX } from "@/lib/colors";
import { SECTOR_CENTROIDS } from "@/lib/geo";
import type { EncounterRecord, Particle } from "@/lib/types";
import type { OriginRegion } from "@/lib/colors";

interface Props {
  data: EncounterRecord[];
  currentMonth: string;
  width: number;
  height: number;
}

export default function USMap({ data, currentMonth, width, height }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const prevMonthRef = useRef<string>("");
  const [topoData, setTopoData] = useState<Topology | null>(null);

  useEffect(() => {
    import("us-atlas/counties-10m.json").then((mod) => {
      setTopoData(mod.default as unknown as Topology);
    });
  }, []);

  const projection = useMemo(() => {
    return geoAlbersUsa()
      .scale(width * 1.1)
      .translate([width / 2, height / 2]);
  }, [width, height]);

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const states = useMemo(() => {
    if (!topoData) return [];
    const geom = topoData.objects.states as GeometryCollection;
    return topojson.feature(topoData, geom).features;
  }, [topoData]);

  const projectedSectors = useMemo(() => {
    const result: Record<string, [number, number] | null> = {};
    for (const [key, [lat, lng]] of Object.entries(SECTOR_CENTROIDS)) {
      result[key] = projection([lng, lat]) as [number, number] | null;
    }
    return result;
  }, [projection]);

  const spawnParticles = useCallback(
    (month: string) => {
      const monthData = data.filter((d) => d.month === month);
      const newParticles: Particle[] = [];

      for (const record of monthData) {
        const projected = projectedSectors[record.sector];
        if (!projected) continue;

        const count = Math.max(1, Math.round(record.count / 100));
        for (let i = 0; i < count; i++) {
          const jitterX = (Math.random() - 0.5) * 30;
          const jitterY = (Math.random() - 0.5) * 20;
          const tx = projected[0] + jitterX;
          const ty = projected[1] + jitterY;

          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 100;
          const sx = tx + Math.cos(angle) * dist;
          const sy = ty + Math.sin(angle) * dist;

          newParticles.push({
            x: sx,
            y: sy,
            targetX: tx,
            targetY: ty,
            color: REGION_HEX[record.region as OriginRegion] ?? REGION_HEX.other,
            opacity: 0,
            birthMonth: month,
            settled: false,
            vx: 0,
            vy: 0,
          });
        }
      }
      return newParticles;
    },
    [data, projectedSectors]
  );

  useEffect(() => {
    if (currentMonth === prevMonthRef.current) return;

    if (currentMonth < prevMonthRef.current) {
      particlesRef.current = particlesRef.current.filter(
        (p) => p.birthMonth <= currentMonth
      );
    }

    if (currentMonth > prevMonthRef.current || prevMonthRef.current === "") {
      const newP = spawnParticles(currentMonth);
      particlesRef.current = [...particlesRef.current, ...newP];
    }

    prevMonthRef.current = currentMonth;
  }, [currentMonth, spawnParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const particles = particlesRef.current;

      for (const p of particles) {
        if (!p.settled) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.5) {
            p.x = p.targetX;
            p.y = p.targetY;
            p.settled = true;
            p.opacity = 0.85;
          } else {
            p.x += dx * 0.08;
            p.y += dy * 0.08;
            p.opacity = Math.min(0.85, p.opacity + 0.05);
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [width, height]);

  return (
    <div className="relative" style={{ width, height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0"
      >
        {states.map((feature, i) => (
          <path
            key={i}
            d={pathGenerator(feature) ?? ""}
            fill="#EFEDE8"
            stroke="#E5E5E5"
            strokeWidth={0.5}
          />
        ))}
      </svg>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width, height }}
      />
    </div>
  );
}
