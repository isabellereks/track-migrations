"use client";

import Link from "next/link";
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
const HistoricalContext = dynamic(
  () => import("@/components/sections/HistoricalContext")
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
      <HistoricalContext />
      <AboutData />

      <footer className="relative z-10 bg-white border-t border-black/[.06]">
        <div className="max-w-5xl mx-auto px-8 py-10 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
          <span>Track Migrations</span>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-ink transition-colors">
              About
            </Link>
            <Link href="/methodology" className="hover:text-ink transition-colors">
              Methodology
            </Link>
            <Link href="/contact" className="hover:text-ink transition-colors">
              Contact
            </Link>
          </div>
          <span>
            Built by{" "}
            <a
              href="https://x.com/isareksopuro"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-muted/40 decoration-[0.5px] underline-offset-4 hover:decoration-ink hover:text-ink transition-colors"
            >
              @isareksopuro
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
