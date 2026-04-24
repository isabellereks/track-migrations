"use client";

import Link from "next/link";

export default function AboutData() {
  return (
    <section
      id="about"
      className="relative z-10 bg-bg border-t border-black/[.06]"
    >
      <div className="max-w-5xl mx-auto px-8 pt-16 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-ink tracking-tight mb-2">
              Methodology
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              This site combines data from CBP encounter records, Census ACS
              foreign-born estimates, USCIS admission statistics, and refugee
              arrival data. Each measures a different population: crossings,
              settlement, and legal classification.
            </p>
          </div>
          <Link
            href="/methodology"
            className="text-[11px] font-medium text-muted hover:text-ink transition-colors shrink-0 border border-black/[.06] rounded-lg px-4 py-2"
          >
            Full methodology & sources
          </Link>
        </div>
      </div>
    </section>
  );
}
