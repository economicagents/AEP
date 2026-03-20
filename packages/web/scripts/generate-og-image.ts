#!/usr/bin/env npx tsx
/**
 * Generate OG/Twitter preview image.
 *
 * Full-frame plasma dither overlay on cream, very light opacity.
 * Logo + "AEP (Agent Economic Protocol)" centered.
 *
 * Output: public/opengraph-image.png (1200×630)
 *
 * Run manually: pnpm run generate-og
 * Validate at /opengraph-image.png before committing.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// 8x8 Bayer for finer, less chunky dither
const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const W = 1200;
const H = 630;

const CREAM = { r: 250, g: 248, b: 243 };
const SLATE = { r: 15, g: 23, b: 42 };
// Softer green for OG blobs — less saturated, blends better on cream
const GREEN_SOFT = { r: 45, g: 115, b: 75 };

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function plasma(x: number, y: number, w: number, h: number, t: number): number {
  const cx = w / 2;
  const cy = h / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const p1 = Math.sin(dist * 0.1 - t * 2);
  const p2 = Math.sin(x * 0.1 + t);
  const p3 = Math.sin(y * 0.1 + t * 0.7);
  const p4 = Math.sin((x + y) * 0.05 + t * 1.3);
  return ((p1 + p2 + p3 + p4) / 4) * 0.5 + 0.5;
}

function warp(x: number, y: number, w: number, h: number, t: number): number {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const w1 = Math.sin(dist * 0.15 - t * 3 + angle * 2) * 0.5 + 0.5;
  const w2 = Math.sin(dist * 0.08 + t * 2) * 0.5 + 0.5;
  return (w1 + w2) / 2;
}

function generateVoronoiPoints(bw: number, bh: number, count: number): { x: number; y: number }[] {
  const rng = mulberry32(0x0a3f);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    points.push({ x: rng() * bw, y: rng() * bh });
  }
  return points;
}

function generateDitheredBlob(
  blobW: number,
  blobH: number,
  variant: "plasma" | "warp",
  t: number,
  lightTheme: boolean
): Buffer {
  const points = generateVoronoiPoints(blobW, blobH, Math.floor((blobW * blobH) / 120));
  const out = Buffer.alloc(blobW * blobH * 4);
  const accent = lightTheme ? GREEN_SOFT : CREAM;
  const bg = lightTheme ? CREAM : SLATE;

  for (let y = 0; y < blobH; y++) {
    for (let x = 0; x < blobW; x++) {
      let value: number;
      if (points.length > 0) {
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
        const sx = points[nearest].x;
        const sy = points[nearest].y;
        value = variant === "plasma" ? plasma(sx, sy, blobW, blobH, t) : warp(sx, sy, blobW, blobH, t);
      } else {
        value =
          variant === "plasma"
            ? plasma(x, y, blobW, blobH, t)
            : warp(x, y, blobW, blobH, t);
      }

      const threshold = BAYER_8X8[y % 8][x % 8] / 64;
      const dithered = value > threshold;
      const color = dithered ? accent : bg;

      const idx = (y * blobW + x) * 4;
      out[idx] = color.r;
      out[idx + 1] = color.g;
      out[idx + 2] = color.b;
      out[idx + 3] = 255;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const root = join(dir, "..");
  const publicDir = join(root, "public");
  const outPath = join(publicDir, "opengraph-image.png");

  if (!existsSync(publicDir)) {
    console.error("public/ directory not found");
    process.exit(1);
  }

  const t = 0;

  const lightTheme = true;

  // 1. Solid cream background (light theme hero base)
  const bgBuffer = Buffer.alloc(W * H * 4);
  const bgColor = lightTheme ? CREAM : SLATE;
  for (let i = 0; i < W * H; i++) {
    bgBuffer[i * 4] = bgColor.r;
    bgBuffer[i * 4 + 1] = bgColor.g;
    bgBuffer[i * 4 + 2] = bgColor.b;
    bgBuffer[i * 4 + 3] = 255;
  }

  // 2. Single full-frame dithered overlay (plasma), very light
  const ditherBuffer = generateDitheredBlob(W, H, "plasma", t, lightTheme);
  const opacity = 0.07;

  for (let i = 0; i < W * H; i++) {
    const a = opacity;
    const idx = i * 4;
    const r = (1 - a) * bgBuffer[idx] + a * ditherBuffer[idx];
    const g = (1 - a) * bgBuffer[idx + 1] + a * ditherBuffer[idx + 1];
    const b = (1 - a) * bgBuffer[idx + 2] + a * ditherBuffer[idx + 2];
    bgBuffer[idx] = Math.round(r);
    bgBuffer[idx + 1] = Math.round(g);
    bgBuffer[idx + 2] = Math.round(b);
  }

  let img = sharp(bgBuffer, { raw: { width: W, height: H, channels: 4 } });

  // 5. Logo + banner on same line (header-style), centered
  const logoPath = join(publicDir, lightTheme ? "logo.svg" : "logo-dark.svg");
  if (!existsSync(logoPath)) {
    console.error(`Logo not found: ${logoPath}`);
    process.exit(1);
  }

  const logoSize = 120;
  const gap = 14;
  const textWidthEst = 420;
  const bannerWidth = logoSize + gap + textWidthEst;
  const logoLeft = Math.round((W - bannerWidth) / 2);
  const logoTop = Math.round((H - logoSize) / 2);
  const textX = logoLeft + logoSize + gap;
  const textY = logoTop + Math.round(logoSize / 2) + 18;
  const domainY = H - 36;

  const logoBuffer = await sharp(logoPath).resize(logoSize, logoSize).png().toBuffer();

  const textColor = lightTheme ? "#166534" : "#faf8f3";
  const textColorMuted = lightTheme ? "rgba(22,101,52,0.65)" : "rgba(250,248,243,0.8)";
  const domainColor = lightTheme ? "rgba(22,101,52,0.45)" : "rgba(250,248,243,0.5)";

  const textSvg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${textX}" y="${textY}" text-anchor="start" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="48" font-weight="700" fill="${textColor}" letter-spacing="-0.02em">
    <tspan>AEP</tspan>
    <tspan font-size="28" font-weight="500" fill="${textColorMuted}" letter-spacing="-0.01em" dx="8">(Agent Economic Protocol)</tspan>
  </text>
  <text x="${W / 2}" y="${domainY}" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="500" fill="${domainColor}" letter-spacing="0.02em">economicagents.org</text>
</svg>`;

  const textBuffer = await sharp(Buffer.from(textSvg)).resize(W, H).png().toBuffer();

  img = img.composite([
    { input: logoBuffer, left: logoLeft, top: logoTop },
    { input: textBuffer, left: 0, top: 0 },
  ]);

  await img.png({ compressionLevel: 6 }).toFile(outPath);
  console.log(`Generated ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
