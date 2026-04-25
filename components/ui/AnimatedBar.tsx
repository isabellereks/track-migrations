"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  width: string;
  color: string;
  height?: string;
  delay?: number;
  className?: string;
}

export default function AnimatedBar({
  width,
  color,
  height = "100%",
  delay = 0,
  className = "rounded-full",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        setRevealed(true);
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Animate `transform: scaleX()` instead of `width`. Width transitions force
  // a full layout/paint per frame for every animating bar (and any siblings
  // that depend on its size). scaleX is a compositor-only transform — no
  // layout, no main-thread paint — so bar charts with N rows go from N
  // layout-thrashing animations to N GPU-cheap ones. The element keeps its
  // final width in the layout tree so flex siblings size correctly; only the
  // rendered geometry is scaled.
  return (
    <div
      ref={ref}
      className={className}
      style={{
        width,
        height,
        backgroundColor: color,
        transform: revealed ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "0 50%",
        transition: `transform 800ms cubic-bezier(0.32, 0.72, 0, 1) ${delay}ms`,
        willChange: revealed ? undefined : "transform",
      }}
    />
  );
}
