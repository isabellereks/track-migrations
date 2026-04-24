"use client";

import FadeInOnView from "@/components/ui/FadeInOnView";

const SOURCES = [
  {
    name: "CBP Nationwide Encounters",
    description:
      "Monthly encounter counts by sector, nationality, demographic category, and encounter type. Updated monthly by US Customs and Border Protection.",
    url: "https://www.cbp.gov/newsroom/stats/nationwide-encounters",
  },
  {
    name: "American Community Survey (ACS)",
    description:
      "Foreign-born population estimates by state and county, including country of birth and year of entry. Published by the US Census Bureau.",
    url: "https://data.census.gov",
  },
  {
    name: "USCIS Immigration Statistics",
    description:
      "Lawful permanent resident data by country of birth and admission category (employment, family, refugee, diversity visa). Published in the DHS Yearbook of Immigration Statistics.",
    url: "https://www.dhs.gov/immigration-statistics/yearbook",
  },
  {
    name: "WRAPS Refugee Admissions",
    description:
      "Monthly refugee arrival data including nationality, state and city of initial resettlement. Published by the Refugee Processing Center.",
    url: "https://www.wrapsnet.org",
  },
  {
    name: "Deportation Data Project",
    description:
      "FOIA-obtained CBP and ICE data with improved documentation and individual-level records.",
    url: "https://deportationdata.org/data.html",
  },
];

export default function AboutData() {
  return (
    <section
      id="about"
      className="relative z-10 bg-white border-t border-black/[.06]"
    >
      <div className="max-w-5xl mx-auto px-8 pt-20 pb-24">
        <div className="text-[13px] font-medium text-muted tracking-tight mb-2">
          05 · About this data
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold text-ink tracking-tight leading-[1.1] mb-4">
          Sources &amp; methodology
        </h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl mb-10">
          This site combines data from multiple US government sources.
          Border encounter data (CBP) measures crossings. Settlement data
          (Census ACS) measures where foreign-born people live. Admission
          category data (USCIS) measures how people were legally classified.
          These are distinct populations — crossing ≠ settlement ≠ legal
          admission.
        </p>

        <FadeInOnView>
          <div className="space-y-4">
            {SOURCES.map((source) => (
              <div
                key={source.name}
                className="bg-bg rounded-xl border border-black/[.06] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink tracking-tight mb-1">
                      {source.name}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed">
                      {source.description}
                    </p>
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-medium text-muted hover:text-ink transition-colors shrink-0 border border-black/[.06] rounded-lg px-3 py-1.5"
                  >
                    View source ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </FadeInOnView>

        <FadeInOnView delay={80}>
          <div className="mt-10 bg-bg rounded-xl border border-black/[.06] px-5 py-4">
            <h3 className="text-xs font-semibold text-ink tracking-tight mb-2">
              Caveats &amp; limitations
            </h3>
            <ul className="text-xs text-muted leading-relaxed space-y-1.5 list-disc list-inside">
              <li>
                Encounter counts include repeat crossings — the same
                individual may be counted multiple times.
              </li>
              <li>
                ACS foreign-born estimates lag by ~2 years and include all
                foreign-born residents regardless of immigration status.
              </li>
              <li>
                Admission categories from USCIS cover lawful permanent
                residents only, not temporary workers or undocumented
                individuals.
              </li>
              <li>
                Sample data is currently used for development. Real data
                pipeline integration is in progress.
              </li>
            </ul>
          </div>
        </FadeInOnView>
      </div>
    </section>
  );
}
