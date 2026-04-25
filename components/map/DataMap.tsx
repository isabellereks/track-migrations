"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useDeferredValue,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import TimeScrubber from "./TimeScrubber";
import FilterBar from "./FilterBar";
import MapSidebar from "./MapSidebar";
import MapLegend from "./MapLegend";
import DotTooltip from "./DotTooltip";
import { getSampleData, getMonths } from "@/lib/sample-data";
import { getSnapshot, presetKeyFor } from "@/lib/aggregates";
import { FILTER_LAYERS, STATUS_LAYERS } from "@/lib/types";
import type { FilterPreset, FilterMode, StatusPreset, MigrationLayer } from "@/lib/types";
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
  const [filterMode, setFilterMode] = useState<FilterMode>("pathway");
  const [activePreset, setActivePreset] = useState<FilterPreset>("all");
  const [statusPreset, setStatusPreset] = useState<StatusPreset>("all");
  const [borderView, setBorderView] = useState<"entered" | "stopped">("entered");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 560 });
  const [hoveredDot, setHoveredDot] = useState<HoveredDot | null>(null);

  // useTransition lets us mark heavy filter changes (preset/mode/borderView)
  // as non-urgent so the click/visual feedback isn't blocked by the O(N)
  // re-filter of the 136k-record dataset.
  const [isFilterPending, startFilterTransition] = useTransition();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Coalesce ResizeObserver bursts to one update per frame. RO can fire
    // every observed mutation during a window-edge drag; setting dimensions
    // every fire kicks off heavy work (canvas resize, hit-mask GPU readback,
    // particle rescale, animate effect teardown/setup). One update per frame
    // is plenty for a smooth resize.
    let raf = 0;
    let pendingW = 0;
    let pendingH = 0;
    const apply = () => {
      raf = 0;
      setDimensions({ width: pendingW, height: pendingH });
    };
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      pendingW = Math.floor(width);
      pendingH = Math.floor(Math.min(width * 0.62, window.innerHeight - 200));
      if (raf === 0) raf = requestAnimationFrame(apply);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const started = monthIndex >= 0;
  const currentMonth = months[Math.max(0, monthIndex)] ?? "2020-01";

  const currentPresetKey = filterMode === "pathway" ? activePreset : statusPreset;

  const activeLayers = useMemo((): Set<MigrationLayer> => {
    if (filterMode === "status") {
      return new Set(STATUS_LAYERS[statusPreset]);
    }
    return new Set(FILTER_LAYERS[activePreset]);
  }, [filterMode, activePreset, statusPreset]);

  // Deferred currentMonth/preset key so the heavy snapshot lookup (and
  // any downstream React re-renders of the sidebar tree) yield to the map
  // animation. The snapshot itself is O(1) once built, but the first build
  // for a preset takes ~10–30 ms; useDeferredValue keeps that off the
  // urgent path entirely.
  const deferredMonth = useDeferredValue(currentMonth);
  const snapshotKey = presetKeyFor(filterMode, currentPresetKey, borderView);
  const deferredKey = useDeferredValue(snapshotKey);
  const sidebarStale = deferredMonth !== currentMonth || deferredKey !== snapshotKey;

  // O(1) Map lookup into pre-aggregated cumulative snapshots. Replaces three
  // O(N=136k) scans (totalUpToMonth/topNationalities/topVisaClasses) that
  // previously ran on every monthIndex tick.
  const snapshot = useMemo(
    () => getSnapshot(deferredKey, deferredMonth),
    [deferredKey, deferredMonth]
  );
  const total = snapshot.cumulativeTotal;
  const monthTotal = snapshot.monthTotal;
  const topCountries = snapshot.topCountries;
  const topVisas = snapshot.topVisas;

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

  const handleModeChange = useCallback((mode: FilterMode) => {
    startFilterTransition(() => {
      setFilterMode(mode);
      if (mode === "pathway") {
        setActivePreset("all");
      } else {
        setStatusPreset("all");
      }
    });
  }, []);

  const handlePresetChange = useCallback(
    (preset: string) => {
      startFilterTransition(() => {
        if (filterMode === "pathway") {
          setActivePreset(preset as FilterPreset);
        } else {
          setStatusPreset(preset as StatusPreset);
        }
      });
    },
    [filterMode]
  );

  const handleBorderViewChange = useCallback((v: "entered" | "stopped") => {
    startFilterTransition(() => {
      setBorderView(v);
    });
  }, []);

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

      {/* Mode toggle + Filter bar — centered top */}
      <div className="absolute top-5 inset-x-0 z-20 hidden sm:flex flex-col items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleModeChange("pathway")}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
              filterMode === "pathway" ? "bg-ink text-white" : "text-muted hover:text-ink"
            }`}
          >
            By pathway
          </button>
          <button
            onClick={() => handleModeChange("status")}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
              filterMode === "status" ? "bg-ink text-white" : "text-muted hover:text-ink"
            }`}
          >
            By status
          </button>
        </div>
        <div
          style={{
            opacity: isFilterPending ? 0.7 : 1,
            transition: "opacity 160ms ease",
          }}
        >
          <FilterBar
            mode={filterMode}
            active={currentPresetKey}
            onChange={handlePresetChange}
          />
        </div>
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
            activeLayers={activeLayers}
            borderView={borderView}
            onHover={setHoveredDot}
          />
        )}
      </div>

      {/* Sidebar — right edge, vertically centered. Sidebar consumes deferred
         values: its readouts are allowed to lag a frame behind the map so
         heavy aggregation never blocks the animation loop. */}
      <div
        className="absolute right-5 top-1/2 -translate-y-1/2 hidden lg:block z-20"
        style={{
          opacity: sidebarStale || isFilterPending ? 0.6 : 1,
          transition: "opacity 160ms ease",
        }}
      >
        <MapSidebar
          filterMode={filterMode}
          activePreset={currentPresetKey}
          currentMonth={deferredMonth}
          totalEncounters={total}
          monthTotal={monthTotal}
          topCountries={topCountries}
          topVisas={topVisas}
          borderView={borderView}
          onBorderViewChange={handleBorderViewChange}
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
          visaClass={hoveredDot.visaClass}
          visaClassLabel={hoveredDot.visaClassLabel}
          arrestAggregate={hoveredDot.arrestAggregate}
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
        legend={<MapLegend activePreset={currentPresetKey} />}
      />
    </div>
  );
}
