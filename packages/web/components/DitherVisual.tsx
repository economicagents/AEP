"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

// 4x4 Bayer dither matrix
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Seeded random for deterministic Voronoi points
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Design system colors — theme-aware
// Light: green dithered on cream. Dark: cream dithered on slate (same cream as light bg)
const COLORS = {
  light: {
    accent: { r: 22, g: 101, b: 52 }, // #166534 green
    background: { r: 250, g: 248, b: 243 }, // #faf8f3 cream
  },
  dark: {
    accent: { r: 250, g: 248, b: 243 }, // #faf8f3 cream (same as light mode background)
    background: { r: 15, g: 23, b: 42 }, // #0f172a slate-900
  },
} as const;

/** Cell shape: "grid" = square pixels (Bayer), "voronoi" = irregular organic cells */
type CellShape = "grid" | "voronoi";

interface DitherVisualProps {
  width?: number;
  height?: number;
  className?: string;
  variant?: "wave" | "plasma" | "warp";
  speed?: number;
  inverted?: boolean;
  cellShape?: CellShape;
}

function computeValue(
  x: number,
  y: number,
  width: number,
  height: number,
  variant: "wave" | "plasma" | "warp",
  t: number
): number {
  switch (variant) {
    case "wave": {
      const wave1 = Math.sin(x * 0.1 + t * 2) * 0.5 + 0.5;
      const wave2 = Math.sin(y * 0.08 - t * 1.5) * 0.5 + 0.5;
      const wave3 = Math.sin((x + y) * 0.05 + t) * 0.5 + 0.5;
      return (wave1 + wave2 + wave3) / 3;
    }
    case "plasma": {
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const plasma1 = Math.sin(dist * 0.1 - t * 2);
      const plasma2 = Math.sin(x * 0.1 + t);
      const plasma3 = Math.sin(y * 0.1 + t * 0.7);
      const plasma4 = Math.sin((x + y) * 0.05 + t * 1.3);
      return ((plasma1 + plasma2 + plasma3 + plasma4) / 4) * 0.5 + 0.5;
    }
    case "warp": {
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const warp = Math.sin(dist * 0.15 - t * 3 + angle * 2) * 0.5 + 0.5;
      const ripple = Math.sin(dist * 0.08 + t * 2) * 0.5 + 0.5;
      return (warp + ripple) / 2;
    }
  }
}

function generateVoronoiPoints(w: number, h: number, count: number): { x: number; y: number }[] {
  const rng = mulberry32(0x0a3f);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    points.push({ x: rng() * w, y: rng() * h });
  }
  return points;
}

export function DitherVisual({
  width = 128,
  height = 128,
  className = "",
  variant = "plasma",
  speed = 1,
  inverted = false,
  cellShape = "voronoi",
}: DitherVisualProps) {
  const { resolved } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points =
      cellShape === "voronoi" ? generateVoronoiPoints(width, height, Math.floor((width * height) / 80)) : [];

    // Use DOM data-theme as source of truth (avoids hydration/timing mismatch)
    const theme =
      typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    const palette = COLORS[theme];
    const fg = inverted ? palette.background : palette.accent;
    const bg = inverted ? palette.accent : palette.background;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const render = (t: number) => {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let value: number;

          if (cellShape === "voronoi" && points.length > 0) {
            // Find nearest Voronoi seed
            let nearest = 0;
            let minDistSq = Infinity;
            for (let i = 0; i < points.length; i++) {
              const dx = x - points[i].x;
              const dy = y - points[i].y;
              const d2 = dx * dx + dy * dy;
              if (d2 < minDistSq) {
                minDistSq = d2;
                nearest = i;
              }
            }
            // Value comes from the cell center — each organic cell gets one shade
            value = computeValue(points[nearest].x, points[nearest].y, width, height, variant, t);
          } else {
            value = computeValue(x, y, width, height, variant, t);
          }

          // Apply Bayer dithering
          const threshold = BAYER_4X4[y % 4][x % 4] / 16;
          const dithered = value > threshold;

          const color = dithered ? fg : bg;
          const idx = (y * width + x) * 4;
          data[idx] = color.r;
          data[idx + 1] = color.g;
          data[idx + 2] = color.b;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    // If speed is 0, render once with t=0 (static)
    if (speed === 0) {
      render(0);
      return;
    }

    // Otherwise, animate
    const animate = (timestamp: number) => {
      timeRef.current = timestamp * 0.001 * speed;
      render(timeRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, variant, speed, inverted, cellShape, resolved]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        imageRendering: "pixelated",
        display: "block",
      }}
    />
  );
}
