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

  return (
    <div
      ref={ref}
      className={className}
      style={{
        width: revealed ? width : "0%",
        height,
        backgroundColor: color,
        transition: `width 800ms cubic-bezier(0.32, 0.72, 0, 1) ${delay}ms`,
      }}
    />
  );
}
