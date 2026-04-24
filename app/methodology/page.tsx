import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology · Track Migrations",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-8 py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-16"
        >
          ← Back
        </Link>

        <div className="text-[13px] font-medium text-muted tracking-tight mb-3">
          Methodology
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold text-ink tracking-tight leading-[1.05] mb-10">
          How the data works
        </h1>

        <div className="text-base text-ink/80 leading-relaxed space-y-5">
          <p>
            If you spot something wrong,{" "}
            <Link
              href="/contact"
              className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
            >
              please let me know
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-ink tracking-tight pt-4">
            What the map shows
          </h2>
          <p>
            The particle map combines data from multiple US government
            sources. Each dot represents roughly 300 people. The data is
            layered by how people arrived: legal admissions through ports
            of entry, border encounters recorded by CBP, visa overstays
            estimated by DHS, and &ldquo;gotaways&rdquo; (known but
            unapprehended crossings) from CBP operational data and
            congressional testimony.
          </p>
          <p>
            These are distinct populations. Border encounter data (CBP)
            measures crossings. Settlement data (Census ACS) measures
            where foreign-born people live. Admission category data
            (USCIS) measures how people were legally classified. Each
            tells a different part of the story.
          </p>

          <h2 className="text-xl font-semibold text-ink tracking-tight pt-4">
            Settlement destinations
          </h2>
          <p>
            Where dots land on the map is based on Census ACS
            foreign-born population data, weighted by region-of-origin
            affinities. For example, Mexican-origin dots are more likely
            to settle in Texas, California, and Illinois because that
            matches the actual settlement patterns in ACS data. The
            scatter radius is randomized within metro areas for
            readability.
          </p>

          <h2 className="text-xl font-semibold text-ink tracking-tight pt-4">
            Gotaway estimates
          </h2>
          <p>
            The &ldquo;uncounted&rdquo; layer uses known gotaway
            figures from CBP operational data shared in congressional
            briefings and testimony. CBP does not officially publish
            these numbers; they originate from internal dashboards
            reported by news outlets and confirmed in hearings
            (notably Border Patrol Chief Raul Ortiz&rsquo;s Senate
            Judiciary Committee testimony in May 2023). Monthly values
            are weighted by seasonal border crossing patterns.
          </p>

          <h2 className="text-xl font-semibold text-ink tracking-tight pt-4">
            Economic data
          </h2>
          <p>
            The economic sections draw from published research by the
            Congressional Budget Office, Brookings Institution, Peterson
            Institute for International Economics, Cato Institute,
            Economic Policy Institute, ITEP, and others. Each figure
            is cited inline and linked to its source where available.
          </p>

          <h2 className="text-xl font-semibold text-ink tracking-tight pt-4">
            Caveats
          </h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              Encounter counts include repeat crossings; the same
              individual may be counted multiple times.
            </li>
            <li>
              ACS foreign-born estimates lag by approximately two years
              and include all foreign-born residents regardless of
              immigration status.
            </li>
            <li>
              USCIS admission categories cover lawful permanent residents
              only, not temporary workers or undocumented individuals.
            </li>
            <li>
              Gotaway figures are approximate. By definition they exclude
              people who crossed without being detected at all.
            </li>
          </ul>
        </div>

        <div className="mt-16 pt-10 border-t border-black/[.06] space-y-8">
          <div>
            <div className="text-[13px] font-medium text-muted tracking-tight mb-1">
              Sources
            </div>
            <p className="text-[13px] text-muted leading-relaxed max-w-prose">
              Every dataset is drawn from a public source. Inline
              citations appear throughout the editorial sections; this
              is the full rollup.
            </p>
          </div>

          <SourceGroup title="Border and encounters">
            <SourceItem
              name="CBP Nationwide Encounters"
              href="https://www.cbp.gov/newsroom/stats/nationwide-encounters"
              note="monthly encounter counts by sector, nationality, demographic, and encounter type"
            />
            <SourceItem
              name="Deportation Data Project"
              href="https://deportationdata.org/data.html"
              note="FOIA-obtained CBP and ICE individual-level records: arrests, detentions, removals"
            />
            <SourceItem
              name="TRAC Immigration (Syracuse University)"
              href="https://tracreports.org"
              note="ICE detention snapshots, criminal history breakdown, court backlogs"
            />
          </SourceGroup>

          <SourceGroup title="Legal admissions and settlement">
            <SourceItem
              name="USCIS Immigration Statistics / DHS Yearbook"
              href="https://www.dhs.gov/immigration-statistics/yearbook"
              note="LPR data by country of birth and admission category"
            />
            <SourceItem
              name="American Community Survey (Census Bureau)"
              href="https://data.census.gov"
              note="foreign-born population by state, county, country of birth, year of entry"
            />
            <SourceItem
              name="WRAPS Refugee Admissions"
              href="https://www.wrapsnet.org"
              note="monthly refugee arrivals by nationality and resettlement location"
            />
          </SourceGroup>

          <SourceGroup title="Economic impact">
            <SourceItem
              name="Congressional Budget Office (CBO)"
              href="https://www.cbo.gov"
              note="GDP baseline projections, immigration fiscal impact estimates"
            />
            <SourceItem
              name="Brookings Institution"
              href="https://www.brookings.edu"
              note="GDP growth impact analysis (January 2026 report)"
            />
            <SourceItem
              name="Peterson Institute for International Economics"
              href="https://www.piie.com"
              note="mass deportation economic modeling"
            />
            <SourceItem
              name="Cato Institute"
              href="https://www.cato.org"
              note="30-year fiscal impact analysis, net surplus estimates (February 2026)"
            />
            <SourceItem
              name="Economic Policy Institute (EPI)"
              href="https://www.epi.org"
              note="unauthorized immigrant workforce analysis, industry breakdown"
            />
            <SourceItem
              name="Institute on Taxation and Economic Policy (ITEP)"
              href="https://itep.org"
              note="state and local tax contributions by undocumented immigrants"
            />
            <SourceItem
              name="Social Security Administration"
              href="https://www.ssa.gov"
              note="contributions by undocumented workers to Social Security trust fund"
            />
            <SourceItem
              name="American Immigration Council"
              href="https://www.americanimmigrationcouncil.org"
              note="state-by-state immigrant economic activity and spending power"
            />
            <SourceItem
              name="Pew Research Center"
              href="https://www.pewresearch.org"
              note="unauthorized immigrant population estimates and workforce share"
            />
            <SourceItem
              name="Bureau of Labor Statistics (BLS)"
              href="https://www.bls.gov"
              note="foreign-born labor force statistics, industry employment"
            />
            <SourceItem
              name="USDA National Agricultural Workers Survey (NAWS)"
              href="https://www.dol.gov/agencies/eta/national-agricultural-workers-survey"
              note="farmworker demographics and authorization status"
            />
          </SourceGroup>

          <SourceGroup title="Maps and geography">
            <SourceItem
              name="us-atlas (Mike Bostock)"
              href="https://github.com/topojson/us-atlas"
              note="US state and county topojson boundaries"
            />
            <SourceItem
              name="D3.js"
              href="https://d3js.org"
              note="geographic projections and path rendering"
            />
          </SourceGroup>
        </div>
      </div>
    </main>
  );
}

function SourceGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-medium text-muted tracking-tight mb-2">
        {title}
      </h3>
      <ul className="text-sm text-ink/80 leading-relaxed space-y-1.5">
        {children}
      </ul>
    </div>
  );
}

function SourceItem({
  name,
  href,
  note,
}: {
  name: string;
  href?: string;
  note?: string;
}) {
  return (
    <li>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
        >
          {name}
        </a>
      ) : (
        <span className="text-ink">{name}</span>
      )}
      {note && <span className="text-muted"> — {note}</span>}
    </li>
  );
}
