"use client";

import { useRef, useEffect } from "react";

export default function HeroMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, w, h);
    };

    function draw(c: CanvasRenderingContext2D, w: number, h: number) {
      c.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.42;

      // Paper-grain noise via subtle rectangles
      c.globalAlpha = 0.03;
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        c.fillStyle = Math.random() > 0.5 ? "#8B7355" : "#A09070";
        c.fillRect(x, y, 1, 1);
      }
      c.globalAlpha = 1;

      // Radial vignette
      const vignette = c.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.1);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.06)");
      c.fillStyle = vignette;
      c.fillRect(0, 0, w, h);

      // Ocean circle
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fillStyle = "#D4C9B8";
      c.fill();

      // Graticule lines
      c.strokeStyle = "rgba(0,0,0,0.06)";
      c.lineWidth = 0.5;
      for (let i = -80; i <= 80; i += 20) {
        const y2 = cy + (i / 90) * r;
        const xSpan = Math.sqrt(Math.max(0, r * r - (y2 - cy) * (y2 - cy)));
        c.beginPath();
        c.moveTo(cx - xSpan, y2);
        c.lineTo(cx + xSpan, y2);
        c.stroke();
      }
      for (let i = -180; i <= 180; i += 30) {
        c.beginPath();
        for (let lat = -90; lat <= 90; lat += 2) {
          const y2 = cy + (lat / 90) * r;
          const xSpan = Math.sqrt(
            Math.max(0, r * r - (y2 - cy) * (y2 - cy))
          );
          const x = cx + (i / 180) * xSpan;
          if (lat === -90) c.moveTo(x, y2);
          else c.lineTo(x, y2);
        }
        c.stroke();
      }

      // Simplified Americas landmass shapes
      c.fillStyle = "#E8DFD0";
      c.strokeStyle = "#C8BBA8";
      c.lineWidth = 1;

      // North America (simplified)
      c.beginPath();
      const naPoints = [
        [0.38, 0.22], [0.42, 0.18], [0.50, 0.20], [0.55, 0.22],
        [0.58, 0.28], [0.60, 0.35], [0.57, 0.40], [0.55, 0.42],
        [0.52, 0.45], [0.50, 0.48], [0.48, 0.50], [0.46, 0.48],
        [0.42, 0.45], [0.38, 0.40], [0.35, 0.35], [0.33, 0.28],
      ];
      for (let i = 0; i < naPoints.length; i++) {
        const x = cx + (naPoints[i][0] - 0.5) * r * 2;
        const y = cy + (naPoints[i][1] - 0.5) * r * 2;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.stroke();

      // Central America
      c.beginPath();
      const caPoints = [
        [0.48, 0.50], [0.49, 0.52], [0.48, 0.55], [0.47, 0.53],
        [0.46, 0.51],
      ];
      for (let i = 0; i < caPoints.length; i++) {
        const x = cx + (caPoints[i][0] - 0.5) * r * 2;
        const y = cy + (caPoints[i][1] - 0.5) * r * 2;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.stroke();

      // South America
      c.beginPath();
      const saPoints = [
        [0.50, 0.56], [0.54, 0.58], [0.56, 0.62], [0.57, 0.68],
        [0.55, 0.75], [0.52, 0.80], [0.48, 0.82], [0.46, 0.78],
        [0.45, 0.72], [0.44, 0.66], [0.46, 0.60],
      ];
      for (let i = 0; i < saPoints.length; i++) {
        const x = cx + (saPoints[i][0] - 0.5) * r * 2;
        const y = cy + (saPoints[i][1] - 0.5) * r * 2;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.stroke();

      // Europe/Africa hint on right edge
      c.beginPath();
      const euPoints = [
        [0.72, 0.25], [0.75, 0.28], [0.76, 0.35], [0.74, 0.40],
        [0.72, 0.38], [0.70, 0.30],
      ];
      for (let i = 0; i < euPoints.length; i++) {
        const x = cx + (euPoints[i][0] - 0.5) * r * 2;
        const y = cy + (euPoints[i][1] - 0.5) * r * 2;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.stroke();

      // Africa hint
      c.beginPath();
      const afPoints = [
        [0.72, 0.42], [0.76, 0.45], [0.77, 0.55], [0.75, 0.65],
        [0.72, 0.68], [0.70, 0.60], [0.69, 0.50],
      ];
      for (let i = 0; i < afPoints.length; i++) {
        const x = cx + (afPoints[i][0] - 0.5) * r * 2;
        const y = cy + (afPoints[i][1] - 0.5) * r * 2;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
      c.stroke();

      // Globe border
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.strokeStyle = "rgba(0,0,0,0.08)";
      c.lineWidth = 1.5;
      c.stroke();
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
