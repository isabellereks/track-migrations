"use client";

import { useMemo } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import { getEconomicData } from "@/lib/economic-data";
import { ECON_HEX, ENFORCE_HEX } from "@/lib/colors";

function formatB(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function WhatTheyBuilt() {
  const econ = useMemo(() => getEconomicData(), []);
  const { national, byIndustry, ledger, gdpScenarios } = econ;

  const gdpMax = Math.max(...gdpScenarios.map((s) => s.baseline));
  const gdpMin = Math.min(...gdpScenarios.map((s) => s.deportation));
  const gdpRange = gdpMax - gdpMin + 2;
  const chartH = 200;

  const lastScenario = gdpScenarios[gdpScenarios.length - 1];
  const gdpGap = lastScenario.baseline - lastScenario.deportation;

  return (
    <section id="economic" className="relative z-10 bg-bg border-t border-black/[.06]">
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-4">
          What they built
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-14">
          The same population measured by enforcement statistics also sustains
          industries, pays taxes, and generates economic output. An estimated
          8.3 million undocumented workers live in the US, most working
          informally on farms, construction sites, restaurant kitchens, and
          in private homes.
        </p>

        {/* Ledger comparison — no cards, just aligned typography */}
        <FadeInOnView>
          <div className="mb-16">
            <div className="grid grid-cols-2 gap-x-16">
              <div className="text-xs font-medium text-muted tracking-tight pb-4 border-b border-black/[.06]">
                What enforcement costs
              </div>
              <div className="text-xs font-medium text-muted tracking-tight pb-4 border-b border-black/[.06]">
                What immigrants contribute
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-16">
              {ledger.map((row, i) => (
                <div key={`e-${i}`} className="contents">
                  <div className="pt-4 pb-4 border-b border-black/[.03]">
                    <div className="text-xl font-semibold text-ink tracking-tight tabular-nums">
                      {row.enforcement.value}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {row.enforcement.label}
                    </div>
                  </div>
                  <div className="pt-4 pb-4 border-b border-black/[.03]">
                    <div className="text-xl font-semibold tracking-tight tabular-nums" style={{ color: ECON_HEX.taxes }}>
                      {row.contribution.value}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {row.contribution.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInOnView>

        {/* Social Security — inline editorial, not a hero card */}
        <FadeInOnView>
          <div className="mb-16 max-w-2xl">
            <div className="text-sm text-ink/80 leading-relaxed">
              Undocumented workers paid{" "}
              <span className="font-semibold text-ink">{formatB(national.socialSecurityPaid)}</span>{" "}
              into Social Security in 2022. They are ineligible to collect
              benefits. They paid{" "}
              <span className="font-semibold text-ink">{formatB(national.medicarePaid)}</span>{" "}
              into Medicare under the same terms. The gap between what they pay in
              and what they can draw out subsidizes the trust fund for all other
              beneficiaries.
            </div>
            <div className="text-[11px] text-muted mt-3">
              Social Security Administration, ITEP
            </div>
          </div>
        </FadeInOnView>

        {/* Industry breakdown — table rows, not card grid */}
        <FadeInOnView>
          <div className="mb-16">
            <h3 className="text-lg font-semibold text-ink tracking-tight mb-6">
              Industries sustained
            </h3>
            <div className="space-y-0">
              {byIndustry.map((ind) => {
                const undocPct = Math.round(ind.undocumentedShare * 100);
                const otherImmPct = Math.round((ind.immigrantShare - ind.undocumentedShare) * 100);
                return (
                  <div key={ind.industry} className="py-5 border-b border-black/[.06] first:border-t">
                    <div className="flex items-start gap-8">
                      <div className="w-40 shrink-0">
                        <div className="text-sm font-semibold text-ink tracking-tight">
                          {ind.industry}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">
                          {ind.estimatedWorkers} workers
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex h-6 rounded-full overflow-hidden mb-2">
                          <div
                            style={{
                              width: `${undocPct}%`,
                              backgroundColor: ECON_HEX.jobs,
                            }}
                          />
                          <div
                            style={{
                              width: `${otherImmPct}%`,
                              backgroundColor: ECON_HEX.gdp,
                            }}
                          />
                          <div className="flex-1 bg-black/[.04]" />
                        </div>
                        <div className="text-xs text-muted leading-relaxed">
                          {ind.detail}
                        </div>
                      </div>
                      <div className="w-56 shrink-0 text-xs text-muted leading-relaxed hidden md:block">
                        {ind.impact}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-5 mt-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ECON_HEX.jobs }} />
                <span className="text-[10px] text-muted">Undocumented</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ECON_HEX.gdp }} />
                <span className="text-[10px] text-muted">Other immigrant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-black/[.04]" />
                <span className="text-[10px] text-muted">US-born</span>
              </div>
            </div>
            <div className="text-[11px] text-muted mt-3">
              Pew, EPI, NAWS, BLS, AIC, Census
            </div>
          </div>
        </FadeInOnView>

        {/* Tax contributions — streamlined, no card */}
        <FadeInOnView>
          <div className="mb-16 max-w-xl">
            <h3 className="text-lg font-semibold text-ink tracking-tight mb-6">
              Tax contributions
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-ink font-medium">All immigrants</span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatB(national.totalTaxesPaid)}
                  </span>
                </div>
                <div className="h-5 bg-black/[.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "100%",
                      backgroundColor: ECON_HEX.taxes,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-ink font-medium">Undocumented households</span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatB(national.undocumentedTaxesPaid)}
                  </span>
                </div>
                <div className="h-5 bg-black/[.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(national.undocumentedTaxesPaid / national.totalTaxesPaid) * 100}%`,
                      backgroundColor: ECON_HEX.gdp,
                    }}
                  />
                </div>
                <div className="mt-3 pl-1 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Social Security</span>
                    <span className="text-ink tabular-nums">{formatB(national.socialSecurityPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Medicare</span>
                    <span className="text-ink tabular-nums">{formatB(national.medicarePaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Federal income (ITIN)</span>
                    <span className="text-ink tabular-nums">
                      {formatB(national.undocumentedTaxesPaid - national.socialSecurityPaid - national.medicarePaid)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-muted mt-4">
              American Immigration Council, ITEP, SSA
            </div>
          </div>
        </FadeInOnView>

        {/* GDP chart — full width, no card wrapper */}
        <FadeInOnView>
          <div className="mb-16">
            <h3 className="text-lg font-semibold text-ink tracking-tight mb-2">
              GDP with and without immigrants
            </h3>
            <p className="text-xs text-muted leading-relaxed max-w-xl mb-6">
              CBO baseline projection vs. Peterson Institute mass deportation
              scenario. The gap represents {formatB(gdpGap * 1_000_000_000_000)} in lost
              output by {lastScenario.year}.
            </p>
            <div className="flex gap-6 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-4 h-[2px] rounded-full" style={{ backgroundColor: ECON_HEX.taxes }} />
                <span className="text-[11px] text-muted">CBO baseline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-[2px] rounded-full border-t-2 border-dashed" style={{ borderColor: ENFORCE_HEX.arrest }} />
                <span className="text-[11px] text-muted">Mass deportation scenario</span>
              </div>
            </div>
            <svg
              viewBox={`0 0 600 ${chartH + 30}`}
              className="w-full"
              aria-label="GDP projection comparison chart"
              role="img"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = gdpMin - 1 + gdpRange * (1 - t);
                const y = 10 + t * chartH;
                return (
                  <g key={t}>
                    <line
                      x1={60}
                      y1={y}
                      x2={580}
                      y2={y}
                      stroke="rgba(0,0,0,0.06)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={55}
                      y={y + 4}
                      textAnchor="end"
                      fontSize={10}
                      fill="#86868B"
                    >
                      ${val.toFixed(0)}T
                    </text>
                  </g>
                );
              })}

              <path
                d={
                  gdpScenarios
                    .map((s, i) => {
                      const x = 60 + (i / (gdpScenarios.length - 1)) * 520;
                      const y = 10 + ((gdpMax + 1 - s.baseline) / gdpRange) * chartH;
                      return `${i === 0 ? "M" : "L"}${x},${y}`;
                    })
                    .join(" ") +
                  " " +
                  gdpScenarios
                    .slice()
                    .reverse()
                    .map((s, i) => {
                      const x = 60 + ((gdpScenarios.length - 1 - i) / (gdpScenarios.length - 1)) * 520;
                      const y = 10 + ((gdpMax + 1 - s.deportation) / gdpRange) * chartH;
                      return `L${x},${y}`;
                    })
                    .join(" ") +
                  " Z"
                }
                fill={ECON_HEX.taxes}
                opacity={0.08}
              />

              <path
                d={gdpScenarios
                  .map((s, i) => {
                    const x = 60 + (i / (gdpScenarios.length - 1)) * 520;
                    const y = 10 + ((gdpMax + 1 - s.baseline) / gdpRange) * chartH;
                    return `${i === 0 ? "M" : "L"}${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={ECON_HEX.taxes}
                strokeWidth={2}
              />

              <path
                d={gdpScenarios
                  .map((s, i) => {
                    const x = 60 + (i / (gdpScenarios.length - 1)) * 520;
                    const y = 10 + ((gdpMax + 1 - s.deportation) / gdpRange) * chartH;
                    return `${i === 0 ? "M" : "L"}${x},${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={ENFORCE_HEX.arrest}
                strokeWidth={2}
                strokeDasharray="6 4"
              />

              {gdpScenarios.map((s, i) => {
                const x = 60 + (i / (gdpScenarios.length - 1)) * 520;
                return (
                  <text
                    key={s.year}
                    x={x}
                    y={chartH + 26}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#86868B"
                  >
                    {s.year}
                  </text>
                );
              })}
            </svg>
            <div className="text-[11px] text-muted mt-3">
              CBO, Peterson Institute for International Economics
            </div>
          </div>
        </FadeInOnView>

        {/* Closing stats — flowing narrative, not isolated callouts */}
        <FadeInOnView>
          <div className="border-t border-black/[.06] pt-10 max-w-2xl">
            <div className="text-sm text-ink/80 leading-relaxed space-y-4">
              <p>
                Net migration likely went negative in 2025 for the first time in
                decades. Brookings estimates GDP growth reduced by 0.19 to 0.26
                percentage points, with consumer spending declining $60 to $110
                billion over 2025 and 2026.
              </p>
              <p>
                Over a 30-year horizon, the Cato Institute estimates all
                immigrants produce a net fiscal surplus of{" "}
                <span className="font-semibold text-ink">{formatB(national.catoFiscalSurplus30yr)}</span>.
                Without immigrants, public debt would exceed 200% of GDP.
              </p>
            </div>
            <div className="text-[11px] text-muted mt-4">
              Brookings Institution (January 2026), Cato Institute (February 2026)
            </div>
          </div>
        </FadeInOnView>
      </div>
    </section>
  );
}
