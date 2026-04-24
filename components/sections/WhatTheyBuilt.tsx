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
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-10">
          The same population measured by enforcement statistics also sustains
          industries, pays taxes, and generates economic output. These are
          the numbers on the other side of the ledger.
        </p>

        {/* Invisible workforce callout */}
        <FadeInOnView>
          <div className="bg-white rounded-2xl border border-black/[.06] p-6 mb-10 max-w-2xl">
            <p className="text-sm text-ink leading-relaxed">
              An estimated 8.3 million undocumented workers live in the US.
              Most work informally, paid in cash on farms, construction sites,
              restaurant kitchens, and in private homes. Their labor is invisible
              to the IRS but visible at the grocery store, in the price of your
              house, and on your plate.
            </p>
            <p className="text-[11px] text-muted mt-3">
              Pew Research Center, Economic Policy Institute, USDA NAWS
            </p>
          </div>
        </FadeInOnView>

        {/* Two-ledger layout */}
        <FadeInOnView delay={60}>
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-ink tracking-tight mb-4">
              Two sides of the ledger
            </h3>
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <div className="text-xs font-medium text-muted tracking-tight mb-4">
                  Enforcement costs
                </div>
                <div className="space-y-4">
                  {ledger.map((row, i) => (
                    <div key={i}>
                      <div className="text-lg font-semibold text-ink tracking-tight">
                        {row.enforcement.value}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {row.enforcement.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted tracking-tight mb-4">
                  Immigrant contributions
                </div>
                <div className="space-y-4">
                  {ledger.map((row, i) => (
                    <div key={i}>
                      <div className="text-lg font-semibold text-ink tracking-tight">
                        {row.contribution.value}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {row.contribution.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeInOnView>

        {/* Social Security paradox */}
        <FadeInOnView delay={80}>
          <div className="bg-white rounded-2xl border border-black/[.06] p-8 mb-12 max-w-xl">
            <div className="text-4xl md:text-5xl font-semibold text-ink tracking-tight leading-none mb-2">
              {formatB(national.socialSecurityPaid)}
            </div>
            <div className="text-sm text-muted mb-4">
              paid into Social Security by undocumented workers in 2022
            </div>
            <div className="h-px bg-black/[.06] mb-4" />
            <div className="text-4xl md:text-5xl font-semibold text-ink tracking-tight leading-none mb-2">
              $0
            </div>
            <div className="text-sm text-muted">
              eligible to receive
            </div>
            <p className="text-[11px] text-muted mt-4">
              Social Security Administration, ITEP. Undocumented workers
              subsidize the trust fund for all other beneficiaries.
            </p>
          </div>
        </FadeInOnView>

        {/* Industry impact cards */}
        <FadeInOnView delay={100}>
          <h3 className="text-lg font-semibold text-ink tracking-tight mb-4">
            Industries sustained
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {byIndustry.map((ind, i) => (
              <FadeInOnView key={ind.industry} delay={100 + i * 40}>
                <div className="bg-white rounded-2xl border border-black/[.06] p-6 h-full">
                  <h4 className="text-sm font-semibold text-ink tracking-tight mb-3">
                    {ind.industry}
                  </h4>
                  <div className="text-xs text-muted leading-relaxed mb-3">
                    {ind.detail}
                  </div>

                  {/* Workforce composition bar */}
                  <div className="flex h-5 rounded-full overflow-hidden mb-3">
                    <div
                      style={{
                        width: `${ind.undocumentedShare * 100}%`,
                        backgroundColor: ECON_HEX.jobs,
                      }}
                    />
                    <div
                      style={{
                        width: `${(ind.immigrantShare - ind.undocumentedShare) * 100}%`,
                        backgroundColor: ECON_HEX.gdp,
                      }}
                    />
                    <div
                      className="flex-1 bg-black/[.06]"
                    />
                  </div>
                  <div className="flex gap-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ECON_HEX.jobs }} />
                      <span className="text-[10px] text-muted">Undocumented</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ECON_HEX.gdp }} />
                      <span className="text-[10px] text-muted">Other immigrant</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-black/[.06]" />
                      <span className="text-[10px] text-muted">US-born</span>
                    </div>
                  </div>

                  <div className="h-px bg-black/[.06] mb-3" />
                  <p className="text-xs text-muted leading-relaxed">
                    {ind.impact}
                  </p>
                  <p className="text-[11px] text-muted mt-2">{ind.sources}</p>
                </div>
              </FadeInOnView>
            ))}
          </div>
        </FadeInOnView>

        {/* GDP counterfactual chart */}
        <FadeInOnView delay={120}>
          <h3 className="text-lg font-semibold text-ink tracking-tight mb-2">
            GDP with and without immigrants
          </h3>
          <p className="text-xs text-muted leading-relaxed max-w-xl mb-6">
            CBO baseline projection vs. Peterson Institute mass deportation
            scenario. The gap represents {formatB(gdpGap * 1_000_000_000_000)} in lost
            economic output by {lastScenario.year}.
          </p>
          <div className="bg-white rounded-2xl border border-black/[.06] p-6 mb-10">
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
                opacity={0.1}
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
            <p className="text-[11px] text-muted mt-3">
              CBO, Peterson Institute for International Economics
            </p>
          </div>
        </FadeInOnView>

        {/* Tax contribution breakdown */}
        <FadeInOnView delay={140}>
          <h3 className="text-lg font-semibold text-ink tracking-tight mb-4">
            Tax contributions
          </h3>
          <div className="bg-white rounded-2xl border border-black/[.06] p-6 mb-10 max-w-xl">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-muted">Total immigrant taxes</span>
                  <span className="text-xs font-medium text-ink tabular-nums">
                    {formatB(national.totalTaxesPaid)}
                  </span>
                </div>
                <div className="h-6 bg-black/[.03] rounded-full overflow-hidden">
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
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-muted">Undocumented household taxes</span>
                  <span className="text-xs font-medium text-ink tabular-nums">
                    {formatB(national.undocumentedTaxesPaid)}
                  </span>
                </div>
                <div className="h-6 bg-black/[.03] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(national.undocumentedTaxesPaid / national.totalTaxesPaid) * 100}%`,
                      backgroundColor: ECON_HEX.gdp,
                    }}
                  />
                </div>
              </div>
              <div className="pl-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Social Security</span>
                  <span className="text-xs font-medium text-ink tabular-nums">
                    {formatB(national.socialSecurityPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Medicare</span>
                  <span className="text-xs font-medium text-ink tabular-nums">
                    {formatB(national.medicarePaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted">Federal income (ITIN)</span>
                  <span className="text-xs font-medium text-ink tabular-nums">
                    {formatB(national.undocumentedTaxesPaid - national.socialSecurityPaid - national.medicarePaid)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted mt-4">
              American Immigration Council (2023 Census data), ITEP, Social
              Security Administration
            </p>
          </div>
        </FadeInOnView>

        {/* Brookings impact note */}
        <FadeInOnView delay={160}>
          <div className="bg-bg rounded-xl border border-black/[.06] px-5 py-4 text-xs text-muted leading-relaxed max-w-2xl mb-10">
            Net migration likely went negative in 2025 for the first time in
            decades. Brookings estimates GDP growth reduced by 0.19 to 0.26
            percentage points, with consumer spending declining $60 to $110
            billion over 2025 and 2026, and breakeven monthly job growth
            dropping to 20,000 to 50,000.
            <span className="block mt-1 text-[11px]">
              Brookings Institution, January 2026
            </span>
          </div>
        </FadeInOnView>

        {/* Cato 30-year note */}
        <FadeInOnView delay={180}>
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-4xl md:text-5xl font-semibold tracking-tight" style={{ color: ECON_HEX.taxes }}>
              {formatB(national.catoFiscalSurplus30yr)}
            </span>
            <span className="text-sm text-muted">
              30-year net fiscal surplus from all immigrants
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed max-w-xl">
            Without immigrants, public debt would exceed 200% of GDP.
            Undocumented contribution to deficit reduction alone: $1.7 trillion.
          </p>
          <p className="text-[11px] text-muted mt-2">
            Cato Institute, February 2026
          </p>
        </FadeInOnView>
      </div>
    </section>
  );
}
