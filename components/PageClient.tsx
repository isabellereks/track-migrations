"use client";

import dynamic from "next/dynamic";
import Hero from "@/components/hero/Hero";
import { useScrollProgress } from "@/lib/use-scroll-progress";

const DataMap = dynamic(() => import("@/components/map/DataMap"), {
  ssr: false,
});
const WhereTheyCrossed = dynamic(
  () => import("@/components/sections/WhereTheyCrossed")
);
const WhereTheyCameFrom = dynamic(
  () => import("@/components/sections/WhereTheyCameFrom")
);
const WhyTheyCame = dynamic(
  () => import("@/components/sections/WhyTheyCame")
);
const WhatHappenedNext = dynamic(
  () => import("@/components/sections/WhatHappenedNext")
);
const WhatTheyBuilt = dynamic(
  () => import("@/components/sections/WhatTheyBuilt")
);
const ByTheNumbers = dynamic(
  () => import("@/components/sections/ByTheNumbers")
);
const AboutData = dynamic(
  () => import("@/components/sections/AboutData")
);

export default function PageClient() {
  const progress = useScrollProgress();

  return (
    <>
      <DataMap revealProgress={progress} />
      <Hero progress={progress} />
      <div className="h-[400vh]" aria-hidden />

      <WhereTheyCrossed />
      <WhereTheyCameFrom />
      <WhyTheyCame />
      <WhatHappenedNext />
      <WhatTheyBuilt />
      <ByTheNumbers />
      <AboutData />

      <footer className="relative z-10 bg-bg border-t border-black/[.06]">
        <div className="max-w-5xl mx-auto px-8 py-16">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
            <div>
              <div className="text-sm font-semibold text-ink mb-2">
                Track Migration
              </div>
              <p className="text-xs text-muted leading-relaxed max-w-sm">
                An interactive visualization of immigration to the United States,
                built to make the data accessible and the people behind it visible.
              </p>
            </div>
            <div className="flex gap-12">
              <div className="space-y-2">
                <div className="text-[10px] font-medium text-muted uppercase tracking-widest">
                  Explore
                </div>
                <a href="#origins" className="block text-xs text-muted hover:text-ink transition-colors">Origins</a>
                <a href="#reasons" className="block text-xs text-muted hover:text-ink transition-colors">Reasons</a>
                <a href="#enforcement" className="block text-xs text-muted hover:text-ink transition-colors">Enforcement</a>
                <a href="#economic" className="block text-xs text-muted hover:text-ink transition-colors">Economic impact</a>
                <a href="#about" className="block text-xs text-muted hover:text-ink transition-colors">Methodology</a>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-medium text-muted uppercase tracking-widest">
                  Related
                </div>
                <a href="https://trackpolicy.org" target="_blank" rel="noopener noreferrer" className="block text-xs text-muted hover:text-ink transition-colors">Track Policy</a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-black/[.06] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px] text-muted">
              Data sources: CBP, Census ACS, USCIS, WRAPS, Deportation Data Project
            </span>
            <span className="text-[11px] text-muted">
              Sample data for development
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
