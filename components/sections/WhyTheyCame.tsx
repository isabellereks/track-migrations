"use client";

import { useState } from "react";
import FadeInOnView from "@/components/ui/FadeInOnView";
import {
  REASON_HEX,
  REASON_LABEL,
  type MigrationReason,
} from "@/lib/colors";

interface CountryReason {
  country: string;
  employment: number;
  family: number;
  asylum: number;
  refugee: number;
  diversity: number;
  other: number;
}

const SAMPLE_REASONS: CountryReason[] = [
  { country: "India", employment: 72, family: 18, asylum: 2, refugee: 1, diversity: 5, other: 2 },
  { country: "Mexico", employment: 15, family: 55, asylum: 18, refugee: 1, diversity: 1, other: 10 },
  { country: "China", employment: 45, family: 30, asylum: 12, refugee: 2, diversity: 3, other: 8 },
  { country: "Guatemala", employment: 8, family: 35, asylum: 45, refugee: 3, diversity: 1, other: 8 },
  { country: "Philippines", employment: 20, family: 65, asylum: 3, refugee: 1, diversity: 5, other: 6 },
  { country: "El Salvador", employment: 6, family: 40, asylum: 42, refugee: 2, diversity: 1, other: 9 },
  { country: "DR Congo", employment: 2, family: 5, asylum: 8, refugee: 80, diversity: 3, other: 2 },
  { country: "Cuba", employment: 5, family: 38, asylum: 48, refugee: 4, diversity: 0, other: 5 },
  { country: "Nigeria", employment: 25, family: 15, asylum: 12, refugee: 3, diversity: 38, other: 7 },
  { country: "Venezuela", employment: 4, family: 12, asylum: 72, refugee: 5, diversity: 1, other: 6 },
  { country: "Honduras", employment: 7, family: 38, asylum: 42, refugee: 3, diversity: 1, other: 9 },
  { country: "Haiti", employment: 3, family: 30, asylum: 50, refugee: 8, diversity: 4, other: 5 },
];

const REASONS: MigrationReason[] = [
  "employment",
  "family",
  "asylum",
  "refugee",
  "diversity",
  "other",
];

export default function WhyTheyCame() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section
      id="reasons"
      className="relative z-10 bg-white border-t border-black/[.06]"
    >
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <div className="text-[13px] font-medium text-muted tracking-tight mb-2">
          03 · Why they came
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-4">
          Admission category by country
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-10">
          Lawful permanent residents are classified by admission category.
          The breakdown varies dramatically by country of origin — India is
          overwhelmingly employment-based, while Central American countries
          are heavily asylum and family.
        </p>

        {/* Legend */}
        <FadeInOnView>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
            {REASONS.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-[4px]"
                  style={{ backgroundColor: REASON_HEX[r] }}
                />
                <span className="text-xs font-medium text-ink tracking-tight">
                  {REASON_LABEL[r]}
                </span>
              </div>
            ))}
          </div>
        </FadeInOnView>

        <FadeInOnView delay={60}>
          <div className="space-y-3">
            {SAMPLE_REASONS.map((c) => {
              const isExpanded = expanded === c.country;
              return (
                <button
                  key={c.country}
                  className="w-full text-left group"
                  onClick={() =>
                    setExpanded(isExpanded ? null : c.country)
                  }
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-ink tracking-tight w-28 shrink-0 truncate">
                      {c.country}
                    </span>
                    <div className="flex-1 flex h-7 rounded-full overflow-hidden">
                      {REASONS.map((r) => {
                        const val = c[r];
                        if (val === 0) return null;
                        return (
                          <div
                            key={r}
                            style={{
                              flexGrow: val,
                              backgroundColor: REASON_HEX[r],
                            }}
                            className="transition-opacity"
                          />
                        );
                      })}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 ml-32 grid grid-cols-3 gap-x-8 gap-y-2 animate-fade-rise">
                      {REASONS.map((r) => (
                        <div key={r} className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: REASON_HEX[r] }}
                          />
                          <span className="text-xs text-muted">
                            {REASON_LABEL[r]}
                          </span>
                          <span className="text-xs font-medium text-ink tabular-nums ml-auto">
                            {c[r]}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </FadeInOnView>

        <FadeInOnView delay={120}>
          <div className="mt-10 bg-bg rounded-xl border border-black/[.06] px-5 py-4 text-xs text-muted leading-relaxed max-w-2xl">
            These categories represent how the US government classifies
            admissions, not necessarily individual motivations. Lawful
            immigration (USCIS) and border encounters (CBP) are different
            populations measured by different agencies.
          </div>
        </FadeInOnView>
      </div>
    </section>
  );
}
