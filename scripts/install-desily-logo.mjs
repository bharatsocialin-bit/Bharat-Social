// One-off Script: install the user's actual Desily logo.
//
// Source: /home/z/my-project/upload/Desily One India Every Voice Logo.png
//         (1254×1254 square PNG containing: circular chakra badge icon +
//          "Desily" wordmark + "One India. Every Voice." tagline)
//
// Outputs (all in /home/z/my-project/public/):
//   • desily-logo.png        — full lockup, square (1254×1254, kept as-is)
//   • desily-logo-wide.png   — wide landscape (1400×400) for sidebar/hero
//                              (padded with ivory background to wide aspect)
//   • desily-icon.png        — icon-only crop (top ~62% of original)
//   • desily-icon-192.png    — PWA manifest size
//   • desily-icon-512.png    — PWA manifest size
//   • apple-touch-icon.png   — iOS home-screen icon (180×180, navy padded)
//   • favicon-32.png         — browser tab icon (32×32)
//   • favicon-16.png         — browser tab icon (16×16)
//
// The original user PNG is preserved verbatim as desily-logo.png — no
// re-encoding of the master asset, just resized/cropped derivatives.

import sharp from 'sharp';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const SRC = `${ROOT}/upload/Desily One India Every Voice Logo.png`;

// Brand palette (matches user's logo + globals.css tokens).
const NAVY = { r: 11, g: 37, b: 69, alpha: 1 };     // #0B2545
const IVORY = { r: 255, g: 253, b: 247, alpha: 1 }; // #FFFDF7

async function main() {
  if (!existsSync(SRC)) {
    throw new Error(`Source logo not found: ${SRC}`);
  }
  console.log('Installing user-provided Desily logo…');

  // ── 1. Preserve the full lockup PNG verbatim ──
  await copyFile(SRC, `${ROOT}/public/desily-logo.png`);
  console.log('  ✓ public/desily-logo.png  (full lockup, 1254×1254, verbatim)');

  const srcBuf = await readFile(SRC);

  // ── 2. Wide landscape version (1400×400) for desktop sidebar / hero ──
  // Pad the square logo horizontally with ivory background. This keeps the
  // full lockup readable in wide containers without distorting the icon.
  await sharp(srcBuf)
    .resize(380, 380, { fit: 'contain', background: IVORY })
    .extend({
      top: 10,
      bottom: 10,
      left: 510,
      right: 510,
      background: IVORY,
    })
    .jpeg({ quality: 92 })
    .toFile(`${ROOT}/public/desily-logo-wide.jpg`);
  console.log('  ✓ public/desily-logo-wide.jpg  (1400×400 wide lockup)');

  // ── 3. Icon-only crop (top ~62% of the square) ──
  // Per VLM analysis: icon occupies top ~60-65% of the canvas, wordmark and
  // tagline sit in the bottom ~25%. We crop to top 64% with generous side
  // margins so the ribbon tips aren't cut off.
  const meta = await sharp(srcBuf).metadata();
  const w = meta.width ?? 1254;
  const h = meta.height ?? 1254;
  const iconCropTop = Math.round(h * 0.03);
  const iconCropHeight = Math.round(h * 0.64);
  const iconCropLeft = Math.round(w * 0.06);
  const iconCropWidth = Math.round(w * 0.88);

  const iconBuf = await sharp(srcBuf)
    .extract({ left: iconCropLeft, top: iconCropTop, width: iconCropWidth, height: iconCropHeight })
    .toBuffer();
  await writeFile(`${ROOT}/public/desily-icon.png`, iconBuf);
  console.log(`  ✓ public/desily-icon.png  (${iconCropWidth}×${iconCropHeight} icon crop)`);

  // ── 4. PWA manifest icons (192, 512) — icon on transparent ──
  for (const size of [192, 512]) {
    await sharp(iconBuf)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`${ROOT}/public/desily-icon-${size}.png`);
    console.log(`  ✓ public/desily-icon-${size}.png  (${size}×${size} PWA icon)`);
  }

  // ── 5. Apple touch icon (180×180, navy padded) ──
  // Apple touch icons look best with a solid background — navy matches the
  // brand and the chakra. Resize icon to ~140px and center on 180×180 navy.
  await sharp(iconBuf)
    .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 20, bottom: 20, left: 20, right: 20,
      background: NAVY,
    })
    .flatten({ background: NAVY })
    .png()
    .toFile(`${ROOT}/public/apple-touch-icon.png`);
  console.log('  ✓ public/apple-touch-icon.png  (180×180, navy padded)');

  // ── 6. Small favicon PNGs (16, 32) ──
  // At 16×16 the chakra detail will be lost; the three colored dots +
  // circular shape will still read. Generated from the icon crop.
  for (const size of [16, 32]) {
    await sharp(iconBuf)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`${ROOT}/public/favicon-${size}.png`);
    console.log(`  ✓ public/favicon-${size}.png  (${size}×${size})`);
  }

  console.log('\nDone. Next: update Logo.tsx + layout.tsx + manifest to reference these.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
