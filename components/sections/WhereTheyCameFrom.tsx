"use client";

import { useMemo } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import { getSampleData } from "@/lib/sample-data";
import { REGION_HEX, REGION_LABEL, type OriginRegion } from "@/lib/colors";

export default function WhereTheyCameFrom() {
  const data = useMemo(() => getSampleData(), []);

  const byRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data) {
      map.set(r.region, (map.get(r.region) ?? 0) + r.count);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([region, total]) => ({ region: region as OriginRegion, total }));
  }, [data]);

  const byCountry = useMemo(() => {
    const map = new Map<
      string,
      { name: string; region: OriginRegion; total: number }
    >();
    for (const r of data) {
      const existing = map.get(r.nationality);
      if (existing) {
        existing.total += r.count;
      } else {
        map.set(r.nationality, {
          name: r.nationalityName,
          region: r.region,
          total: r.count,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const grandTotal = byRegion.reduce((s, r) => s + r.total, 0);

  return (
    <section
      id="origins"
      className="relative z-10 bg-bg border-t border-black/[.06]"
    >
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-10">
          Where they came from
        </h2>

        <FadeInOnView>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
            {byRegion.map(({ region, total }) => (
              <div key={region} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-[4px]"
                  style={{ backgroundColor: REGION_HEX[region] }}
                />
                <span className="text-xs font-medium text-ink tracking-tight">
                  {REGION_LABEL[region]}
                </span>
                <span className="text-[11px] text-muted">
                  {((total / grandTotal) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex h-8 rounded-full overflow-hidden mb-10">
            {byRegion.map(({ region, total }) => (
              <div
                key={region}
                style={{
                  flexGrow: total,
                  backgroundColor: REGION_HEX[region],
                }}
                className="transition-opacity hover:opacity-100 first:rounded-l-full last:rounded-r-full"
              />
            ))}
          </div>
        </FadeInOnView>

        <FadeInOnView>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {byCountry.slice(0, 16).map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 py-1">
                <span className="text-xs text-muted w-5 text-right tabular-nums">
                  {i + 1}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: REGION_HEX[c.region] ?? REGION_HEX.other,
                  }}
                />
                <span className="text-sm font-medium text-ink tracking-tight flex-1">
                  {c.name}
                </span>
                <span className="text-xs text-muted tabular-nums">
                  {(c.total / 1_000_000).toFixed(2)}M
                </span>
              </div>
            ))}
          </div>
        </FadeInOnView>
      </div>
    </section>
  );
}
