"use client";

import { useMemo, useState } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import {
  getEnforcementData,
  aggregateEnforcementByMonth,
  ENFORCEMENT_STATS,
} from "@/lib/enforcement-data";
import {
  CRIMINAL_HISTORY_HEX,
  CRIMINAL_HISTORY_LABEL,
  ENFORCE_HEX,
  type CriminalHistory,
} from "@/lib/colors";

const CRIMINAL_KEYS: CriminalHistory[] = [
  "immigration-only",
  "pending-charges",
  "convicted",
];

export default function WhatHappenedNext() {
  const data = useMemo(() => getEnforcementData(), []);
  const monthly = useMemo(() => aggregateEnforcementByMonth(data), [data]);
  const [selectedMonth, setSelectedMonth] = useState(monthly.length - 1);

  const current = monthly[selectedMonth];

  const totalArrests = monthly.reduce((s, m) => s + m.arrests, 0);
  const totalCriminal = monthly.reduce(
    (s, m) => s + m.byCriminalHistory.convicted + m.byCriminalHistory["pending-charges"],
    0
  );
  const noCrimPercent = (((totalArrests - totalCriminal) / totalArrests) * 100).toFixed(1);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const names = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${names[parseInt(mo) - 1]} ${y}`;
  };

  return (
    <section id="enforcement" className="relative z-10 bg-white border-t border-black/[.06]">
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-4">
          What happened next
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-10">
          Most people who crossed the border were released with a notice to
          appear in court. A smaller fraction entered the ICE enforcement
          pipeline: arrested, detained, and in some cases removed.
        </p>

        {/* Funnel breakdown */}
        <FadeInOnView>
          <div className="bg-bg rounded-xl border border-black/[.06] p-6 mb-10 max-w-xl">
            <div className="text-xs font-medium text-muted tracking-tight mb-4">
              Outcome breakdown for encountered individuals
            </div>
            <div className="space-y-3">
              {[
                { label: "Released with NTA", pct: 68, color: ENFORCE_HEX.removed },
                { label: "Removed at border", pct: 24, color: ENFORCE_HEX.removed },
                { label: "Entered ICE pipeline", pct: 8, color: ENFORCE_HEX.arrest },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-ink tracking-tight">
                      {row.label}
                    </span>
                    <span className="text-sm font-semibold text-ink tabular-nums">
                      {row.pct}%
                    </span>
                  </div>
                  <div className="h-5 bg-black/[.03] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${row.pct}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInOnView>

        {/* Key stats */}
        <FadeInOnView delay={60}>
          <div className="space-y-8 mb-12">
            <div className="flex items-baseline gap-4">
              <span className="text-5xl md:text-6xl font-semibold text-ink tracking-tight leading-none">
                {ENFORCEMENT_STATS.currentDetained.toLocaleString()}
              </span>
              <span className="text-sm text-muted">
                people detained by ICE as of April 2026
              </span>
            </div>
            <div className="h-px bg-black/[.06]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-12">
              <div>
                <div className="text-2xl font-semibold text-ink tracking-tight">
                  {noCrimPercent}%
                </div>
                <div className="text-xs text-muted mt-1">
                  of detainees have never been convicted of a criminal offense
                </div>
                <div className="text-[11px] text-muted mt-1">TRAC, April 2026</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-ink tracking-tight">
                  {ENFORCEMENT_STATS.arrestsPerDayMarch2026}
                </div>
                <div className="text-xs text-muted mt-1">
                  arrests per day in March 2026
                </div>
                <div className="text-[11px] text-muted mt-1">Deportation Data Project</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight" style={{ color: ENFORCE_HEX.arrest }}>
                  {ENFORCEMENT_STATS.deathsInCustody}
                </div>
                <div className="text-xs text-muted mt-1">
                  deaths in ICE custody since January 2025
                </div>
                <div className="text-[11px] text-muted mt-1">ICE press releases</div>
              </div>
            </div>
          </div>
        </FadeInOnView>

        {/* Criminal history breakdown */}
        <FadeInOnView delay={80}>
          <div className="mb-10">
            <h3 className="text-lg font-semibold text-ink tracking-tight mb-4">
              Who is being arrested?
            </h3>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
              {CRIMINAL_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-[4px]"
                    style={{ backgroundColor: CRIMINAL_HISTORY_HEX[key] }}
                  />
                  <span className="text-xs font-medium text-ink tracking-tight">
                    {CRIMINAL_HISTORY_LABEL[key]}
                  </span>
                </div>
              ))}
            </div>

            {/* Monthly bar chart */}
            <div className="flex items-end gap-1 h-48 mb-4">
              {monthly.map((m, i) => {
                const maxArr = Math.max(...monthly.map((m) => m.arrests));
                const h = (m.arrests / maxArr) * 100;
                const immPct = m.byCriminalHistory["immigration-only"] / m.arrests;
                const pendPct = m.byCriminalHistory["pending-charges"] / m.arrests;
                const isSelected = i === selectedMonth;
                return (
                  <button
                    key={m.month}
                    className="flex-1 flex flex-col justify-end cursor-pointer group relative"
                    style={{ height: "100%" }}
                    onClick={() => setSelectedMonth(i)}
                    aria-label={`${formatMonth(m.month)}: ${m.arrests.toLocaleString()} arrests`}
                  >
                    <div
                      className="w-full rounded-t-sm transition-opacity"
                      style={{
                        height: `${h}%`,
                        opacity: isSelected ? 1 : 0.6,
                        background: `linear-gradient(to top, ${CRIMINAL_HISTORY_HEX["immigration-only"]} 0%, ${CRIMINAL_HISTORY_HEX["immigration-only"]} ${immPct * 100}%, ${CRIMINAL_HISTORY_HEX["pending-charges"]} ${immPct * 100}%, ${CRIMINAL_HISTORY_HEX["pending-charges"]} ${(immPct + pendPct) * 100}%, ${CRIMINAL_HISTORY_HEX.convicted} ${(immPct + pendPct) * 100}%)`,
                      }}
                    />
                    {isSelected && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-ink whitespace-nowrap">
                        {formatMonth(m.month)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted">
              <span>{formatMonth(monthly[0].month)}</span>
              <span>{formatMonth(monthly[monthly.length - 1].month)}</span>
            </div>
          </div>
        </FadeInOnView>

        {/* Selected month detail */}
        {current && (
          <FadeInOnView delay={100}>
            <div className="bg-bg rounded-xl border border-black/[.06] p-6 mb-10">
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-2xl font-semibold text-ink tracking-tight">
                  {current.arrests.toLocaleString()}
                </span>
                <span className="text-sm text-muted">
                  arrests in {formatMonth(current.month)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="text-xs font-medium text-muted tracking-tight mb-3">
                    Criminal history
                  </div>
                  <div className="flex h-7 rounded-full overflow-hidden mb-3">
                    {CRIMINAL_KEYS.map((key) => {
                      const val = current.byCriminalHistory[key];
                      if (val === 0) return null;
                      return (
                        <div
                          key={key}
                          style={{
                            flexGrow: val,
                            backgroundColor: CRIMINAL_HISTORY_HEX[key],
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="space-y-1.5">
                    {CRIMINAL_KEYS.map((key) => {
                      const val = current.byCriminalHistory[key];
                      const pct = ((val / current.arrests) * 100).toFixed(1);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: CRIMINAL_HISTORY_HEX[key] }}
                          />
                          <span className="text-xs text-muted">
                            {CRIMINAL_HISTORY_LABEL[key]}
                          </span>
                          <span className="text-xs font-medium text-ink tabular-nums ml-auto">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted tracking-tight mb-3">
                    Arrest type
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "At-large (street)", value: current.arrestsAtLarge, color: ENFORCE_HEX.arrest },
                      { label: "Custodial (jail)", value: current.arrestsCustodial, color: ENFORCE_HEX.detained },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-muted">{row.label}</span>
                          <span className="text-xs font-medium text-ink tabular-nums">
                            {((row.value / current.arrests) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-3 bg-black/[.03] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(row.value / current.arrests) * 100}%`,
                              backgroundColor: row.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs font-medium text-muted tracking-tight mb-3">
                    Top nationalities
                  </div>
                  <div className="space-y-1.5">
                    {current.byNationality.slice(0, 5).map((nat, i) => (
                      <div key={nat.countryCode} className="flex items-center gap-2">
                        <span className="text-xs text-muted w-3 text-right tabular-nums">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium text-ink tracking-tight flex-1">
                          {nat.name}
                        </span>
                        <span className="text-xs text-muted tabular-nums">
                          {nat.arrests.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeInOnView>
        )}

        {/* Caveat bar */}
        <FadeInOnView delay={120}>
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-5 py-4 text-xs text-amber-700 leading-relaxed max-w-2xl">
            Government data provided by ICE in response to a FOIA request to the
            Deportation Data Project. ICE data has known reliability issues
            documented by UC Berkeley Law and UCLA researchers. Aggregate counts
            from TRAC at Syracuse University.
          </div>
        </FadeInOnView>
      </div>
    </section>
  );
}
