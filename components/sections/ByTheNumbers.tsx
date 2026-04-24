"use client";

import { useMemo } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
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

  const items = [
    {
      label: "Total encounters",
      value: (stats.totalEncounters / 1_000_000).toFixed(1) + "M",
      sub: "FY2016 – FY2025",
    },
    {
      label: "Peak month",
      value: formatMonth(stats.peak.month),
      sub: `${(stats.peak.total / 1000).toFixed(0)}k encounters`,
    },
    {
      label: "Most common nationality",
      value: stats.topNat[0],
      sub: `${(stats.topNat[1] / 1_000_000).toFixed(1)}M encounters`,
    },
    {
      label: "Unaccompanied minors",
      value: (stats.demographics.uac / 1000).toFixed(0) + "k",
      sub: "Unaccompanied children encountered",
    },
    {
      label: "Family unit individuals",
      value: (stats.demographics.family / 1000).toFixed(0) + "k",
      sub: "Individuals in family units",
    },
  ];

  return (
    <section className="relative z-10 bg-bg border-t border-black/[.06]">
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <div className="text-[13px] font-medium text-muted tracking-tight mb-2">
          04 · By the numbers
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-10">
          Key statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <FadeInOnView key={item.label} delay={i * 60}>
              <div className="bg-white rounded-2xl border border-black/[.06] p-6">
                <div className="text-[11px] font-medium text-muted uppercase tracking-widest mb-3">
                  {item.label}
                </div>
                <div className="text-2xl md:text-3xl font-semibold text-ink tracking-tight leading-tight">
                  {item.value}
                </div>
                <div className="text-xs text-muted mt-1">{item.sub}</div>
              </div>
            </FadeInOnView>
          ))}
        </div>
      </div>
    </section>
  );
}
