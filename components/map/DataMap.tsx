"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import TimeScrubber from "./TimeScrubber";
import {
  getSampleData,
  getMonths,
  topNationalities,
  totalUpToMonth,
} from "@/lib/sample-data";
import { REGION_HEX, type OriginRegion } from "@/lib/colors";

const USMap = dynamic(() => import("./USMap"), { ssr: false });

interface Props {
  revealProgress: number;
}

export default function DataMap({ revealProgress }: Props) {
  const data = useMemo(() => getSampleData(), []);
  const months = useMemo(() => getMonths(), []);
  const [monthIndex, setMonthIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 560 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({
        width: Math.floor(width),
        height: Math.floor(Math.min(width * 0.62, window.innerHeight - 200)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const currentMonth = months[monthIndex] ?? "2016-01";
  const total = useMemo(
    () => totalUpToMonth(data, currentMonth),
    [data, currentMonth]
  );
  const topCountries = useMemo(
    () => topNationalities(data, currentMonth, 5),
    [data, currentMonth]
  );

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setMonthIndex((i) => {
          if (i >= months.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 300);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, months.length]);

  // Auto-play when map is first revealed
  const hasAutoPlayed = useRef(false);
  useEffect(() => {
    if (revealProgress > 0.95 && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      setMonthIndex(0);
      setPlaying(true);
    }
  }, [revealProgress]);

  const visible = revealProgress > 0.5;

  return (
    <div
      className="fixed inset-0 z-10"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="absolute inset-0 bg-bg" />
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center pt-12"
      >
        {dimensions.width > 0 && (
          <USMap
            data={data}
            currentMonth={currentMonth}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}

        {/* Top-5 sidebar */}
        <div className="absolute top-16 right-4 w-52 bg-white/90 backdrop-blur-2xl rounded-2xl border border-black/[.06] p-4 shadow-sm">
          <div className="text-[10px] font-medium text-muted uppercase tracking-widest mb-3">
            Top nationalities
          </div>
          <div className="space-y-2">
            {topCountries.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-xs text-muted w-3">{i + 1}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      REGION_HEX[c.region as OriginRegion] ?? REGION_HEX.other,
                  }}
                />
                <span className="text-xs font-medium text-ink tracking-tight truncate flex-1">
                  {c.name}
                </span>
                <span className="text-[11px] text-muted tabular-nums">
                  {(c.count / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TimeScrubber
        months={months}
        currentIndex={monthIndex}
        onChange={setMonthIndex}
        totalEncounters={total}
        playing={playing}
        onTogglePlay={togglePlay}
      />
    </div>
  );
}
