"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const HeroMap = dynamic(() => import("./HeroMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0" aria-hidden />,
});

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

type Props = {
  progress: number;
};

export default function Hero({ progress }: Props) {
  const headlineOpacity = clamp(1 - progress / 0.2, 0, 1);
  const headlineY = -progress * 40;
  const hintOpacity = clamp(1 - (progress - 0.45) / 0.15, 0, 1);
  const hintProgress = Math.min(100, (progress / 0.55) * 100);

  const zoom = clamp((progress - 0.55) / 0.45, 0, 1);
  const mapScale = 1 + zoom * 1.8;
  const mapOpacity = clamp(1 - (zoom - 0.35) / 0.5, 0, 1);
  const bgOpacity = 1 - zoom;

  const inactive = progress > 0.92;

  useEffect(() => {
    let userScrolled = false;
    let bouncing = false;
    const onScroll = () => {
      if (!bouncing) userScrolled = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const startTimer = window.setTimeout(() => {
      if (userScrolled) return;
      bouncing = true;
      window.scrollTo({
        top: Math.round(window.innerHeight * 0.15),
        behavior: "smooth",
      });
      window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 750);
    }, 2500);
    return () => {
      window.clearTimeout(startTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section
      className="fixed inset-0 z-20 overflow-hidden"
      style={{ pointerEvents: inactive ? "none" : "auto" }}
      aria-hidden={inactive}
    >
      <div
        className="absolute inset-0 bg-bg"
        style={{ opacity: bgOpacity }}
      />

      <div
        className="absolute inset-x-0 top-[24vh] md:top-[18vh] z-0 px-6 text-center pointer-events-none"
        style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          willChange: "transform, opacity",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="mx-auto mb-4 md:mb-6 w-10 h-10 md:w-14 md:h-14 text-ink"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"
          />
        </svg>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-ink leading-[1.1] md:leading-[1.05]">
          Tracking migration
          <br />
          to the United States
        </h1>
      </div>

      <div
        className="absolute inset-x-0 top-[40vh] z-10 flex justify-center"
        style={{
          opacity: mapOpacity,
          transform: `scale(${mapScale})`,
          transformOrigin: "center center",
          willChange: "transform, opacity",
        }}
      >
        <div className="w-[78vh] h-[78vh] aspect-square">
          <HeroMap />
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-[5.5vh] z-20 flex flex-col items-center gap-2.5 pointer-events-none"
        style={{ opacity: hintOpacity }}
        aria-hidden
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-ink tracking-tight">
            Scroll to reveal the map
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-ink"
            style={{ animation: "scroll-hint 1.8s ease-in-out infinite" }}
          >
            <path
              d="M3 4.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="relative w-40 h-[2px] rounded-full bg-ink/10 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-ink"
            style={{ width: `${hintProgress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
