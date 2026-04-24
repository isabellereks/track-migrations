"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface FadeInOnViewProps {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "article" | "li" | "tr";
  className?: string;
  style?: CSSProperties;
}

export default function FadeInOnView({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  style,
}: FadeInOnViewProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const transition = `opacity 180ms cubic-bezier(0.32,0.72,0,1) ${delay}ms, transform 180ms cubic-bezier(0.32,0.72,0,1) ${delay}ms`;
  const mergedStyle: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(3px)",
    transition,
    willChange: shown ? undefined : "opacity, transform",
    ...style,
  };

  const Component = Tag as "div";
  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={mergedStyle}
    >
      {children}
    </Component>
  );
}
