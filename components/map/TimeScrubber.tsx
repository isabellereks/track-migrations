"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  months: string[];
  currentIndex: number;
  onChange: (index: number) => void;
  totalEncounters: number;
  playing: boolean;
  onTogglePlay: () => void;
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
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onChange(Math.round(pct * (months.length - 1)));
    },
    [months.length, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onChange(Math.round(pct * (months.length - 1)));
    },
    [dragging, months.length, onChange]
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

  const progress = months.length > 1 ? currentIndex / (months.length - 1) : 0;
  const currentMonth = months[currentIndex] ?? "2016-01";

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-2xl rounded-2xl border border-black/[.06] px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center hover:bg-ink/80 transition-colors"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="1" width="3" height="10" rx="0.5" />
                <rect x="7" y="1" width="3" height="10" rx="0.5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M3 1.5v9l7-4.5z" />
              </svg>
            )}
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-ink tracking-tight">
              {formatMonth(currentMonth)}
            </div>
            <div className="text-xs text-muted">
              {formatNumber(totalEncounters)} encounters
            </div>
          </div>
          <div className="w-8" />
        </div>
        <div
          ref={trackRef}
          className="relative h-6 flex items-center cursor-pointer touch-none"
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
          <div className="absolute inset-x-0 h-[3px] rounded-full bg-ink/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-ink"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div
            className="absolute w-4 h-4 rounded-full bg-ink shadow-sm border-2 border-white -translate-x-1/2"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted font-medium">
          <span>FY2016</span>
          <span>FY2025</span>
        </div>
      </div>
    </div>
  );
}
