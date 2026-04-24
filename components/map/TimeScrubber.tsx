"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RiPlayFill, RiPauseFill, RiRestartLine } from "@remixicon/react";

interface Props {
  months: string[];
  currentIndex: number;
  onChange: (index: number) => void;
  totalEncounters: number;
  playing: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  legend?: ReactNode;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[parseInt(m) - 1]} ${y}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function TimeScrubber({
  months,
  currentIndex,
  onChange,
  totalEncounters,
  playing,
  onTogglePlay,
  onReplay,
  legend,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const yearTicks = useMemo(() => {
    const ticks: { label: string; pct: number }[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < months.length; i++) {
      const year = months[i].split("-")[0];
      if (!seen.has(year)) {
        seen.add(year);
        ticks.push({ label: year, pct: i / (months.length - 1) });
      }
    }
    return ticks;
  }, [months]);

  const indexFromPointer = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return currentIndex;
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(pct * (months.length - 1));
    },
    [months.length, currentIndex]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      onChange(indexFromPointer(e.clientX));
    },
    [indexFromPointer, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      onChange(indexFromPointer(e.clientX));
    },
    [dragging, indexFromPointer, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        onChange(Math.max(0, currentIndex - 1));
      } else if (e.key === "ArrowRight") {
        onChange(Math.min(months.length - 1, currentIndex + 1));
      } else if (e.key === " ") {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, months.length, onChange, onTogglePlay]);

  const clampedIndex = Math.max(0, currentIndex);
  const progress = months.length > 1 ? clampedIndex / (months.length - 1) : 0;
  const currentMonth = months[clampedIndex] ?? "2020-01";

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-black/[.06] px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Top row: play + date info */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-ink/[.08] text-ink flex items-center justify-center hover:bg-ink/[.14] active:scale-[0.94] transition-colors shrink-0"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <RiPauseFill size={14} />
            ) : (
              <RiPlayFill size={14} />
            )}
          </button>
          <div className="flex items-baseline gap-2 min-w-0 flex-1">
            <span className="text-sm font-semibold text-ink tracking-tight">
              {formatMonth(currentMonth)}
            </span>
            <span className="text-xs text-muted truncate">
              {formatNumber(totalEncounters)} encounters
            </span>
          </div>
          <button
            onClick={onReplay}
            className="w-8 h-8 rounded-full bg-ink/[.08] text-ink flex items-center justify-center hover:bg-ink/[.14] active:scale-[0.94] transition-colors shrink-0"
            aria-label="Replay animation"
          >
            <RiRestartLine size={14} />
          </button>
        </div>

        {/* Track with year ticks */}
        <div
          ref={trackRef}
          className="relative h-11 flex items-center cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="slider"
          aria-label="Timeline"
          aria-valuemin={0}
          aria-valuemax={months.length - 1}
          aria-valuenow={currentIndex}
          aria-valuetext={formatMonth(currentMonth)}
          tabIndex={0}
        >
          {/* Year tick marks */}
          {yearTicks.map(({ label, pct }) => (
            <div
              key={label}
              className="absolute flex flex-col items-center -translate-x-1/2 pointer-events-none"
              style={{ left: `${pct * 100}%`, top: 0, bottom: 0 }}
            >
              <div className="w-px h-2 bg-ink/[.12]" />
              <span className="text-[9px] text-muted/60 mt-0.5 tabular-nums">
                {label.slice(2)}
              </span>
            </div>
          ))}

          {/* Track line */}
          <div className="absolute inset-x-0 top-0 h-[2px] rounded-full bg-ink/[.08]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ink/40"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${progress * 100}%` }}
          >
            <div className="w-[2px] h-3 bg-ink rounded-full" />
            <div className="w-3 h-3 rounded-full bg-ink -mt-0.5 -ml-[5px] border-2 border-white shadow-sm" />
          </div>
        </div>
        {legend && (
          <div className="mt-2.5 pt-2 border-t border-black/[.04]">
            {legend}
          </div>
        )}
      </div>
    </div>
  );
}
