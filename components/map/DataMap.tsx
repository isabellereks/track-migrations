"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import TimeScrubber from "./TimeScrubber";
import FilterBar from "./FilterBar";
import MapSidebar from "./MapSidebar";
import MapLegend from "./MapLegend";
import DotTooltip from "./DotTooltip";
import {
  getSampleData,
  getMonths,
  topNationalities,
  totalUpToMonth,
} from "@/lib/sample-data";
import { FILTER_LAYERS } from "@/lib/types";
import type { FilterPreset } from "@/lib/types";
import type { HoveredDot } from "./USMap";

const USMap = dynamic(() => import("./USMap"), { ssr: false });

interface Props {
  revealProgress: number;
}

export default function DataMap({ revealProgress }: Props) {
  const data = useMemo(() => getSampleData(), []);
  const months = useMemo(() => getMonths(), []);
  const [monthIndex, setMonthIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<FilterPreset>("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 560 });
  const [hoveredDot, setHoveredDot] = useState<HoveredDot | null>(null);

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

  const started = monthIndex >= 0;
  const currentMonth = months[Math.max(0, monthIndex)] ?? "2020-01";

  const filteredData = useMemo(() => {
    const layers = new Set(FILTER_LAYERS[activePreset]);
    return data.filter((r) => layers.has(r.layer));
  }, [data, activePreset]);

  const total = useMemo(
    () => totalUpToMonth(filteredData, currentMonth),
    [filteredData, currentMonth]
  );
  const topCountries = useMemo(
    () => topNationalities(filteredData, currentMonth, 5),
    [filteredData, currentMonth]
  );

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && monthIndex < 0) setMonthIndex(0);
      return !p;
    });
  }, [monthIndex]);

  const replay = useCallback(() => {
    setMonthIndex(0);
    setPlaying(true);
  }, []);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    const tick = () => {
      setMonthIndex((i) => {
        if (i >= months.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
      timerRef.current = setTimeout(tick, 180);
    };

    timerRef.current = setTimeout(tick, 180);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, months.length]);

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

      {/* Filter bar — centered top */}
      <div className="absolute top-5 inset-x-0 z-20 hidden sm:flex justify-center">
        <FilterBar
          active={activePreset}
          onChange={(preset) => {
            setActivePreset(preset);
          }}
        />
      </div>

      {/* Map container — centered */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        {dimensions.width > 0 && (
          <USMap
            data={started ? data : []}
            currentMonth={started ? currentMonth : ""}
            width={dimensions.width}
            height={dimensions.height}
            activePreset={activePreset}
            onHover={setHoveredDot}
          />
        )}
      </div>

      {/* Sidebar — right edge, vertically centered */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden lg:block z-20">
        <MapSidebar
          activePreset={activePreset}
          data={filteredData}
          currentMonth={currentMonth}
          totalEncounters={total}
          topCountries={topCountries}
        />
      </div>

      {/* Tooltip */}
      {hoveredDot && (
        <DotTooltip
          x={hoveredDot.x}
          y={hoveredDot.y}
          nationality={hoveredDot.nationalityName}
          region={hoveredDot.region}
          sector={hoveredDot.sector}
          month={hoveredDot.month}
          demographic={hoveredDot.demographic}
          encounterType={hoveredDot.layer}
          visible={true}
        />
      )}

      <TimeScrubber
        months={months}
        currentIndex={monthIndex}
        onChange={setMonthIndex}
        totalEncounters={total}
        playing={playing}
        onTogglePlay={togglePlay}
        onReplay={replay}
        legend={<MapLegend activePreset={activePreset} />}
      />
    </div>
  );
}
