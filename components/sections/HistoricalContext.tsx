"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import {
  HISTORICAL_IMMIGRATION,
  ANNOTATIONS,
  type HistoricalPoint,
  type Annotation,
} from "@/lib/historical-data";

const CHART_W = 800;
const CHART_H = 440;
const PAD = { top: 72, right: 56, bottom: 36, left: 52 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

const Y_MAX = 55_000_000;
const Y_TICKS = [0, 10_000_000, 20_000_000, 30_000_000, 40_000_000, 50_000_000];
const X_MIN = 1850;
const X_MAX = 2026;
const X_TICKS = [1850, 1900, 1950, 2000];

const SHARE_MAX = 0.16;
const SHARE_TICKS = [0, 0.04, 0.08, 0.12, 0.16];

const HIGHLIGHT_START = 2020;
const HIGHLIGHT_END = 2026;

const ANNO_LABELS: Record<number, string> = {
  2020: "COVID / Title 42",
  2025: "Crackdown",
  2023: "Surge",
  2001: "9/11",
};

const ANNO_Y_OFFSETS: Record<number, number> = {
  1882: 0,
  1924: 0,
  1965: 0,
  1986: 12,
  2001: 0,
  2020: 12,
  2023: 24,
  2025: 0,
};

function xScale(year: number): number {
  return PAD.left + ((year - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
}

function yScale(value: number): number {
  return PAD.top + PLOT_H - (value / Y_MAX) * PLOT_H;
}

function yShareScale(value: number): number {
  return PAD.top + PLOT_H - (value / SHARE_MAX) * PLOT_H;
}

function buildAreaPath(data: HistoricalPoint[]): string {
  const points = data.map((d) => `${xScale(d.year)},${yScale(d.foreignBorn)}`);
  const baseline = `${xScale(data[data.length - 1].year)},${yScale(0)} ${xScale(data[0].year)},${yScale(0)}`;
  return `M${points.join(" L")} L${baseline} Z`;
}

function buildLinePath(data: HistoricalPoint[]): string {
  return data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.year)},${yScale(d.foreignBorn)}`).join(" ");
}

function buildSharePath(data: HistoricalPoint[]): string {
  return data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.year)},${yShareScale(d.share)}`).join(" ");
}

function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function interpolateY(year: number, data: HistoricalPoint[]): number {
  for (let i = 0; i < data.length - 1; i++) {
    if (year >= data[i].year && year <= data[i + 1].year) {
      const t = (year - data[i].year) / (data[i + 1].year - data[i].year);
      return data[i].foreignBorn + t * (data[i + 1].foreignBorn - data[i].foreignBorn);
    }
  }
  return data[data.length - 1].foreignBorn;
}

interface TooltipState {
  x: number;
  y: number;
  type: "point" | "annotation";
  point?: HistoricalPoint;
  annotation?: Annotation;
}

function HistoricalChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      setRevealed(true);
      return;
    }
    const el = svgRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = CHART_W / rect.width;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * (CHART_H / rect.height);

    if (svgX < PAD.left || svgX > CHART_W - PAD.right) {
      setTooltip(null);
      return;
    }

    const year = X_MIN + ((svgX - PAD.left) / PLOT_W) * (X_MAX - X_MIN);

    const nearAnno = ANNOTATIONS.find((a) => Math.abs(xScale(a.year) - svgX) < 12);
    if (nearAnno) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        type: "annotation",
        annotation: nearAnno,
      });
      return;
    }

    let closest = HISTORICAL_IMMIGRATION[0];
    let closestDist = Infinity;
    for (const pt of HISTORICAL_IMMIGRATION) {
      const dist = Math.abs(pt.year - year);
      if (dist < closestDist) {
        closestDist = dist;
        closest = pt;
      }
    }
    if (closestDist < 6) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        type: "point",
        point: closest,
      });
    } else {
      setTooltip(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const areaPath = buildAreaPath(HISTORICAL_IMMIGRATION);
  const linePath = buildLinePath(HISTORICAL_IMMIGRATION);
  const sharePath = buildSharePath(HISTORICAL_IMMIGRATION);

  const connectorY = yShareScale(0.148);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="Area chart showing US foreign-born population from 1850 to 2024, rising from 2.2 million to 50.2 million"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(112,144,200,0.15)" />
            <stop offset="100%" stopColor="rgba(112,144,200,0.02)" />
          </linearGradient>
          <clipPath id="reveal-clip">
            {/* Animate transform: scaleX rather than the rect's width. SVG
                width transitions trigger SVG layout + re-rasterize all clipped
                content per frame — switching to a transform animation keeps
                the work on the compositor. */}
            <rect
              x={PAD.left}
              y={0}
              width={PLOT_W}
              height={CHART_H}
              style={
                reducedMotion
                  ? undefined
                  : {
                      transform: revealed ? "scaleX(1)" : "scaleX(0)",
                      transformOrigin: "0 0",
                      transformBox: "fill-box",
                      transition: "transform 1.5s cubic-bezier(0.32, 0.72, 0, 1)",
                    }
              }
            />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {Y_TICKS.map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            y1={yScale(tick)}
            x2={CHART_W - PAD.right}
            y2={yScale(tick)}
            stroke="rgba(0,0,0,0.04)"
            strokeWidth={1}
          />
        ))}

        {/* Highlight band for FY2020-2026 */}
        <rect
          x={xScale(HIGHLIGHT_START)}
          y={PAD.top}
          width={xScale(HIGHLIGHT_END) - xScale(HIGHLIGHT_START)}
          height={PLOT_H}
          fill="rgba(200,83,74,0.06)"
          rx={2}
        />

        {/* Annotation hairlines — labels above, lines run full height of plot */}
        {ANNOTATIONS.map((a) => {
          const ax = xScale(a.year);
          if (ax < PAD.left || ax > CHART_W - PAD.right) return null;
          const yOff = ANNO_Y_OFFSETS[a.year] ?? 0;
          return (
            <g key={a.year}>
              <line
                x1={ax}
                y1={PAD.top}
                x2={ax}
                y2={yScale(0)}
                stroke="rgba(0,0,0,0.10)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={ax}
                y={PAD.top - 8 - yOff}
                textAnchor="middle"
                className="fill-muted"
                style={{ fontSize: 8.5, fontWeight: 500, letterSpacing: "-0.01em" }}
              >
                {ANNO_LABELS[a.year] ?? a.label}
              </text>
            </g>
          );
        })}

        {/* Clipped area + line */}
        <g clipPath="url(#reveal-clip)">
          <path d={areaPath} fill="url(#area-grad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#7090C8"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Share line (right axis) */}
          <path
            d={sharePath}
            fill="none"
            stroke="#D9A766"
            strokeWidth={1.5}
            strokeDasharray="6 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {HISTORICAL_IMMIGRATION.map((d) => (
            <circle
              key={d.year}
              cx={xScale(d.year)}
              cy={yScale(d.foreignBorn)}
              r={2.5}
              fill="#7090C8"
              stroke="white"
              strokeWidth={1.5}
            />
          ))}
        </g>

        {/* 1890 ↔ 2024 connector: same 14.8% share */}
        <g clipPath="url(#reveal-clip)">
          <line
            x1={xScale(1890)}
            y1={connectorY}
            x2={xScale(2024)}
            y2={connectorY}
            stroke="#D9A766"
            strokeWidth={0.75}
            strokeDasharray="3 3"
            opacity={0.5}
          />
          <circle cx={xScale(1890)} cy={connectorY} r={3} fill="#D9A766" opacity={0.6} />
          <circle cx={xScale(2024)} cy={connectorY} r={3} fill="#D9A766" opacity={0.6} />
          <text
            x={(xScale(1890) + xScale(2024)) / 2}
            y={connectorY - 8}
            textAnchor="middle"
            className="fill-ink"
            style={{ fontSize: 10, fontWeight: 500 }}
          >
            14.8% — same share as 1890
          </text>
        </g>

        {/* "This animation" label inside highlight band */}
        <text
          x={xScale((HIGHLIGHT_START + HIGHLIGHT_END) / 2)}
          y={yScale(0) - 6}
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 8.5, fontWeight: 500 }}
        >
          This animation
        </text>

        {/* Y-axis labels (left: absolute) */}
        {Y_TICKS.map((tick) => (
          <text
            key={tick}
            x={PAD.left - 8}
            y={yScale(tick) + 3.5}
            textAnchor="end"
            className="fill-muted"
            style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
          >
            {tick === 0 ? "0" : `${tick / 1_000_000}M`}
          </text>
        ))}

        {/* Y-axis labels (right: share %) */}
        {SHARE_TICKS.map((tick) => (
          <text
            key={tick}
            x={CHART_W - PAD.right + 8}
            y={yShareScale(tick) + 3.5}
            textAnchor="start"
            className="fill-muted"
            style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
          >
            {`${(tick * 100).toFixed(0)}%`}
          </text>
        ))}

        {/* X-axis labels */}
        {X_TICKS.map((tick) => (
          <text
            key={tick}
            x={xScale(tick)}
            y={yScale(0) + 18}
            textAnchor="middle"
            className="fill-muted"
            style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
          >
            {tick}
          </text>
        ))}

        {/* Axis legend */}
        <g>
          <line x1={CHART_W - PAD.right - 280} y1={CHART_H - 10} x2={CHART_W - PAD.right - 266} y2={CHART_H - 10} stroke="#7090C8" strokeWidth={2} strokeLinecap="round" />
          <text x={CHART_W - PAD.right - 260} y={CHART_H - 6} className="fill-muted" style={{ fontSize: 9 }}>
            Foreign-born population
          </text>
          <line x1={CHART_W - PAD.right - 110} y1={CHART_H - 10} x2={CHART_W - PAD.right - 96} y2={CHART_H - 10} stroke="#D9A766" strokeWidth={1.5} strokeDasharray="6 2" strokeLinecap="round" />
          <text x={CHART_W - PAD.right - 90} y={CHART_H - 6} className="fill-muted" style={{ fontSize: 9 }}>
            Share of total pop.
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none animate-popup-enter"
          style={{
            left: tooltip.x > (typeof window !== "undefined" ? window.innerWidth - 260 : 800) ? tooltip.x - 230 : tooltip.x + 14,
            top: tooltip.y > (typeof window !== "undefined" ? window.innerHeight - 140 : 600) ? tooltip.y - 120 : tooltip.y + 14,
          }}
        >
          <div className="w-52 bg-white/95 backdrop-blur-2xl rounded-xl border border-black/[.06] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-3.5">
            {tooltip.type === "point" && tooltip.point && (
              <>
                <div className="text-xs font-semibold text-ink tracking-tight mb-2">
                  {tooltip.point.year}
                </div>
                <div className="h-px bg-black/[.06] mb-2" />
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[11px] text-muted">Foreign-born</span>
                    <span className="text-[11px] font-medium text-ink">
                      {formatPopulation(tooltip.point.foreignBorn)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-muted">Total pop.</span>
                    <span className="text-[11px] font-medium text-ink">
                      {formatPopulation(tooltip.point.totalPop)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[11px] text-muted">Share</span>
                    <span className="text-[11px] font-medium text-ink">
                      {(tooltip.point.share * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </>
            )}
            {tooltip.type === "annotation" && tooltip.annotation && (
              <>
                <div className="text-xs font-semibold text-ink tracking-tight mb-1">
                  {tooltip.annotation.year}: {tooltip.annotation.label}
                </div>
                <div className="h-px bg-black/[.06] mb-2" />
                <p className="text-[11px] text-muted leading-relaxed">
                  {tooltip.annotation.detail}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoricalContext() {
  return (
    <section className="relative z-10 bg-white border-t border-black/[.06]">
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-4">
          175 years of immigration
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-12">
          The foreign-born population in the United States reached 50.2 million in 2024,
          14.8% of the total population, matching the record set in 1890.
          What looks like a surge is, in historical terms, a return to normal.
        </p>

        <FadeInOnView>
          <HistoricalChart />
        </FadeInOnView>

        <p className="text-[11px] text-muted mt-6 leading-relaxed max-w-xl">
          Source: Migration Policy Institute tabulation of data from U.S. Census Bureau,
          Decennial Census and American Community Survey. The shaded band marks the
          period covered by the interactive map above.
        </p>
      </div>
    </section>
  );
}
