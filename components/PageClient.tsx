"use client";

import dynamic from "next/dynamic";
import Hero from "@/components/hero/Hero";
import Header from "@/components/ui/Header";
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
      <Header />
      <DataMap revealProgress={progress} />
      <Hero progress={progress} />
      <div className="h-[400vh]" aria-hidden />

      <WhereTheyCrossed />
      <WhereTheyCameFrom />
      <WhyTheyCame />
      <ByTheNumbers />
      <AboutData />

      <footer className="relative z-10 bg-bg border-t border-black/[.06]">
        <div className="max-w-5xl mx-auto px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted">
            Track Migration · Data visualization project
          </span>
          <div className="flex items-center gap-6 text-xs text-muted">
            <a
              href="https://trackpolicy.org"
              className="hover:text-ink transition-colors"
            >
              Track Policy
            </a>
            <a
              href="#about"
              className="hover:text-ink transition-colors"
            >
              Methodology
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
