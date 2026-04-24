"use client";

import { useCallback, useMemo } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { getSampleData, aggregateByMonth } from "@/lib/sample-data";

export default function ByTheNumbers() {
  const data = useMemo(() => getSampleData(), []);

  const stats = useMemo(() => {
    const monthly = aggregateByMonth(data);
    const totalEncounters = monthly.reduce((s, m) => s + m.total, 0);
    const peak = monthly.reduce((best, m) =>
      m.total > best.total ? m : best
    );
    const nationalities = new Map<string, number>();
    const demographics = { single: 0, family: 0, uac: 0 };
    for (const r of data) {
      nationalities.set(
        r.nationalityName,
        (nationalities.get(r.nationalityName) ?? 0) + r.count
      );
      if (r.demographic === "family-unit") demographics.family += r.count;
      else if (r.demographic === "unaccompanied-child")
        demographics.uac += r.count;
      else demographics.single += r.count;
    }
    const topNat = Array.from(nationalities.entries()).sort(
      ([, a], [, b]) => b - a
    )[0];
    return { totalEncounters, peak, topNat, demographics };
  }, [data]);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    const names = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${names[parseInt(mo) - 1]} ${y}`;
  };

  const fmtM = useCallback((n: number) => `${(n / 1_000_000).toFixed(1)}M`, []);
  const fmtK = useCallback((n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`, []);

  return (
    <section className="relative z-10 bg-bg border-t border-black/[.06]">
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-10">
          By the numbers
        </h2>

        <FadeInOnView>
          <div className="space-y-8">
            <div className="flex items-baseline gap-4">
              <AnimatedNumber
                value={stats.totalEncounters}
                format={fmtM}
                className="text-5xl md:text-6xl font-semibold text-ink tracking-tight leading-none"
                duration={1600}
              />
              <span className="text-sm text-muted">
                total encounters recorded between FY2016 and FY2025
              </span>
            </div>

            <div className="h-px bg-black/[.06]" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-16">
              <FadeInOnView delay={100}>
                <div>
                  <div className="text-2xl font-semibold text-ink tracking-tight">
                    {formatMonth(stats.peak.month)}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Peak month with{" "}
                    <AnimatedNumber value={stats.peak.total} format={fmtK} duration={1000} />
                    {" "}encounters
                  </div>
                </div>
              </FadeInOnView>
              <FadeInOnView delay={150}>
                <div>
                  <div className="text-2xl font-semibold text-ink tracking-tight">
                    {stats.topNat[0]}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Most common nationality at{" "}
                    <AnimatedNumber value={stats.topNat[1]} format={fmtM} duration={1000} />
                    {" "}encounters
                  </div>
                </div>
              </FadeInOnView>
              <FadeInOnView delay={200}>
                <div>
                  <AnimatedNumber
                    value={stats.demographics.uac}
                    format={fmtK}
                    className="text-2xl font-semibold text-ink tracking-tight"
                    duration={1000}
                  />
                  <div className="text-xs text-muted mt-1">
                    Unaccompanied children encountered at the border
                  </div>
                </div>
              </FadeInOnView>
              <FadeInOnView delay={250}>
                <div>
                  <AnimatedNumber
                    value={stats.demographics.family}
                    format={fmtK}
                    className="text-2xl font-semibold text-ink tracking-tight"
                    duration={1000}
                  />
                  <div className="text-xs text-muted mt-1">
                    Individuals traveling as part of a family unit
                  </div>
                </div>
              </FadeInOnView>
            </div>
          </div>
        </FadeInOnView>
      </div>
    </section>
  );
}
