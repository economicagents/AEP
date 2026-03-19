#!/usr/bin/env npx tsx
/**
 * Square profile / org avatar: dithered plus logo + "AEP" beneath.
 *
 * Renders at 1024×1024 (works well when platforms downscale; min ~420px for GitHub).
 * Logo is upscaled with nearest-neighbor so pixel grid stays sharp.
 *
 * Output: public/profile-avatar.png
 *
 * Run: pnpm run generate-profile-avatar
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SIZE = 1024;
const CREAM = { r: 250, g: 248, b: 243 };
const GREEN = "#166534";

/** Logo viewBox is 32×32; use a multiple of 32 for crisp rasterization. */
const LOGO_PX = 416; // 13×32

async function main(): Promise<void> {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const root = join(dir, "..");
  const publicDir = join(root, "public");
  const outPath = join(publicDir, "profile-avatar.png");
  const logoPath = join(publicDir, "logo.svg");

  if (!existsSync(publicDir)) {
    console.error("public/ directory not found");
    process.exit(1);
  }
  if (!existsSync(logoPath)) {
    console.error(`Logo not found: ${logoPath}`);
    process.exit(1);
  }

  const bg = Buffer.alloc(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const o = i * 4;
    bg[o] = CREAM.r;
    bg[o + 1] = CREAM.g;
    bg[o + 2] = CREAM.b;
    bg[o + 3] = 255;
  }

  const logoLeft = Math.round((SIZE - LOGO_PX) / 2);
  const logoTop = Math.round(SIZE * 0.2);
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_PX, LOGO_PX, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();

  const wordmarkSvg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${SIZE / 2}"
    y="${logoTop + LOGO_PX + 130}"
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    font-size="132"
    font-weight="800"
    fill="${GREEN}"
    letter-spacing="0.06em"
  >AEP</text>
</svg>`;

  const wordmarkBuffer = await sharp(Buffer.from(wordmarkSvg))
    .resize(SIZE, SIZE)
    .png()
    .toBuffer();

  await sharp(bg, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .composite([
      { input: logoBuffer, left: logoLeft, top: logoTop },
      { input: wordmarkBuffer, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`Wrote ${outPath} (${SIZE}×${SIZE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
