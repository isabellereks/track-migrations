"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

const US: [number, number] = [38.9, -97];

const ORIGINS: [number, number][] = [
  [23.6, -102.5],
  [14.6, -90.5],
  [-14.2, -51.9],
  [19.0, -72.8],
  [20.6, 78.9],
  [9.1, 7.5],
  [51.2, 10.4],
];

const ARC_COLOR: [number, number, number] = [0.62, 0.42, 0.40];

const MARKERS = [
  ...ORIGINS.map((loc) => ({
    location: loc,
    size: 0.03,
    color: ARC_COLOR,
  })),
  { location: US, size: 0.05, color: [0.2, 0.2, 0.22] as [number, number, number] },
];

const ARCS = ORIGINS.map((loc) => ({
  from: loc,
  to: US,
  color: ARC_COLOR,
}));

export default function HeroMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(4.7);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = canvas.clientWidth;

    const onResize = () => {
      width = canvas.clientWidth;
      globeRef.current?.update({
        width: width * 2,
        height: width * 2,
      });
    };
    window.addEventListener("resize", onResize);

    let frameId: number;
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: phiRef.current,
      theta: 0.15,
      dark: 0,
      diffuse: 0.6,
      mapSamples: 40000,
      mapBrightness: 1.8,
      mapBaseBrightness: 0.04,
      baseColor: [0.95, 0.93, 0.92],
      markerColor: ARC_COLOR,
      glowColor: [0.97, 0.96, 0.95],
      arcColor: ARC_COLOR,
      arcWidth: 1.5,
      arcHeight: 0.3,
      markers: MARKERS,
      arcs: ARCS,
      opacity: 1,
    } as Parameters<typeof createGlobe>[1]);
    globeRef.current = globe;

    const tick = () => {
      if (pointerInteracting.current === null) {
        phiRef.current += 0.002;
      }
      globe.update({
        phi: phiRef.current + pointerInteractionMovement.current,
      });
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      globe.destroy();
      globeRef.current = null;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block", contain: "layout size", cursor: "grab" }}
      onPointerDown={(e) => {
        pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      }}
      onPointerUp={() => {
        pointerInteracting.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }}
      onPointerOut={() => {
        pointerInteracting.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }}
      onPointerMove={(e) => {
        if (pointerInteracting.current !== null) {
          const delta = e.clientX - pointerInteracting.current;
          pointerInteractionMovement.current = delta / 200;
        }
      }}
    />
  );
}
