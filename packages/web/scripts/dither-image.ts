#!/usr/bin/env npx tsx
/**
 * Dither Image Script
 *
 * Applies a static Bayer dither effect to an input image (PNG/JPEG),
 * using the same algorithm and design colors as DitherVisual.tsx.
 * Outputs two high-quality PNGs: one for light mode, one for dark mode,
 * matching the logo pattern (logo.svg / logo-dark.svg).
 *
 * Usage:
 *   pnpm run dither-image <input.png|jpg> [options]
 *
 * Options:
 *   --variant <bayer4|bayer8|bayer2>  Dither matrix size (default: bayer4)
 *   --inverted                        Swap foreground/background
 *   --max-size <n>                    Max dimension for output (default: 2048)
 *   --output-dir <dir>                Output directory (default: same as input)
 */

import { existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import sharp from "sharp";

// Bayer matrices — same algorithm as DitherVisual.tsx
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 8x8 Bayer for finer detail
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

// 2x2 Bayer for coarser / retro look
const BAYER_2X2 = [
  [0, 2],
  [3, 1],
];

// Design system colors — matches DitherVisual + logo.svg / logo-dark.svg
const COLORS = {
  light: {
    accent: { r: 22, g: 101, b: 52 }, // #166534 green
    background: { r: 250, g: 248, b: 243 }, // #faf8f3 cream
  },
  dark: {
    // Dark mode raster dither: cream vs slate (favicon uses logo-dark.svg: navy in green cells)
    accent: { r: 250, g: 248, b: 243 }, // #faf8f3 cream
    background: { r: 15, g: 23, b: 42 }, // #0f172a slate-900
  },
} as const;

type Variant = "bayer4" | "bayer8" | "bayer2";

function getBayerMatrix(variant: Variant): number[][] {
  switch (variant) {
    case "bayer4":
      return BAYER_4X4;
    case "bayer8":
      return BAYER_8X8;
    case "bayer2":
      return BAYER_2X2;
    default:
      return BAYER_4X4;
  }
}

function getBayerScale(variant: Variant): number {
  switch (variant) {
    case "bayer4":
      return 16;
    case "bayer8":
      return 64;
    case "bayer2":
      return 4;
    default:
      return 16;
  }
}

/** Luminance (0–1) from sRGB */
function luminance(r: number, g: number, b: number): number {
  const sr = r / 255;
  const sg = g / 255;
  const sb = b / 255;
  const r2 = sr <= 0.03928 ? sr / 12.92 : ((sr + 0.055) / 1.055) ** 2.4;
  const g2 = sg <= 0.03928 ? sg / 12.92 : ((sg + 0.055) / 1.055) ** 2.4;
  const b2 = sb <= 0.03928 ? sb / 12.92 : ((sb + 0.055) / 1.055) ** 2.4;
  return 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
}

function parseArgs(): {
  input: string;
  variant: Variant;
  inverted: boolean;
  maxSize: number;
  outputDir: string;
} {
  const args = process.argv.slice(2);
  const supported = [".png", ".jpg", ".jpeg"];
  const input = args.find((a) => !a.startsWith("-") && supported.some((e) => a.toLowerCase().endsWith(e)));
  if (!input) {
    console.error("Usage: pnpm run dither-image <input.png|jpg> [--variant bayer4|bayer8|bayer2] [--inverted] [--max-size N] [--output-dir DIR]");
    process.exit(1);
  }
  if (!existsSync(input)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  const variantIdx = args.indexOf("--variant");
  const variantArg = variantIdx >= 0 ? args[variantIdx + 1] : "bayer4";
  const variant: Variant = ["bayer4", "bayer8", "bayer2"].includes(variantArg) ? (variantArg as Variant) : "bayer4";

  const inverted = args.includes("--inverted");

  const maxSizeIdx = args.indexOf("--max-size");
  const maxSize = maxSizeIdx >= 0 ? parseInt(args[maxSizeIdx + 1], 10) || 2048 : 2048;

  const outputDirIdx = args.indexOf("--output-dir");
  const outputDir = outputDirIdx >= 0 ? args[outputDirIdx + 1] : dirname(input);

  return { input, variant, inverted, maxSize, outputDir };
}

async function main(): Promise<void> {
  const { input, variant, inverted, maxSize, outputDir } = parseArgs();

  const ext = extname(input).toLowerCase();
  const baseName = basename(input, ext);
  const lightOut = join(outputDir, `${baseName}-light.png`);
  const darkOut = join(outputDir, `${baseName}-dark.png`);

  const matrix = getBayerMatrix(variant);
  const scale = getBayerScale(variant);
  const size = matrix.length;

  let img = sharp(input);
  const meta = await img.metadata();
  let w = meta.width ?? 0;
  let h = meta.height ?? 0;
  if (w === 0 || h === 0) {
    console.error("Could not read image dimensions");
    process.exit(1);
  }

  if (w > maxSize || h > maxSize) {
    const ratio = Math.min(maxSize / w, maxSize / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
    img = img.resize(w, h);
  }

  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;

  function ditherToBuffer(theme: "light" | "dark"): Buffer {
    const palette = COLORS[theme];
    const fg = inverted ? palette.background : palette.accent;
    const bg = inverted ? palette.accent : palette.background;

    const out = Buffer.alloc(w * h * 4);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = channels >= 4 ? data[idx + 3] : 255;

        if (a < 32) {
          const outIdx = (y * w + x) * 4;
          out[outIdx] = 0;
          out[outIdx + 1] = 0;
          out[outIdx + 2] = 0;
          out[outIdx + 3] = 0;
          continue;
        }

        const lum = luminance(r, g, b);
        const threshold = matrix[y % size][x % size] / scale;
        const dithered = lum > threshold;

        const color = dithered ? fg : bg;
        const outIdx = (y * w + x) * 4;
        out[outIdx] = color.r;
        out[outIdx + 1] = color.g;
        out[outIdx + 2] = color.b;
        out[outIdx + 3] = 255;
      }
    }

    return out;
  }

  const lightPixels = ditherToBuffer("light");
  const darkPixels = ditherToBuffer("dark");

  await sharp(lightPixels, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 6, quality: 100 })
    .toFile(lightOut);

  await sharp(darkPixels, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 6, quality: 100 })
    .toFile(darkOut);

  console.log(`Wrote ${lightOut} (light mode)`);
  console.log(`Wrote ${darkOut} (dark mode)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
