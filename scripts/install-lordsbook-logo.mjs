// One-off Script: install the Lordsbook shield logo.
//
// Source: /home/z/my-project/upload/Glossy LORDSBOOK Shield Emblem.png
//         (2172×724 RGBA, transparent background, landscape layout:
//          shield emblem on the LEFT + "LORDS/BOOK" banner on the RIGHT)
//
// Per user instruction: use the SHIELD ONLY (no banner). The shield is
// cropped from the left ~26% of the source. The banner text ("LORDSBOOK"
// in their stylized font) is discarded — we render "Lordsbook" in our own
// font in the Logo component instead, per the brand-name format choice.
//
// Outputs (all in /home/z/my-project/public/):
//   • lordsbook-shield.png     — full shield crop, transparent
//   • lordsbook-logo.png       — full source lockup (kept for OG/Twitter cards)
//   • lordsbook-icon-192.png   — PWA manifest size
//   • lordsbook-icon-512.png   — PWA manifest size
//   • apple-touch-icon.png     — iOS home-screen icon (180×180, navy padded)
//   • favicon-16.png           — browser tab icon (16×16)
//   • favicon-32.png           — browser tab icon (32×32)
//
// Source PNG is RGBA with alpha=0 at corners (verified). All derivatives
// preserve transparency so the shield renders cleanly on BOTH light and
// dark backgrounds.

import sharp from 'sharp';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
// Strategy: try BOTH sources and pick the cleaner crop.
// - Luminous (1254×1254 square): shield stacked above banner. Clean horizontal
//   cut at Y=62% separates shield from banner. Shield's pointed tip is at
//   Y=66% (slightly behind banner) — crop at Y=63% gives shield with most
//   of its taper, just a flat bottom cut.
// - Glossy (2172×724 landscape): shield left, banner right. Horizontal
//   overlap at X=22-28% makes clean vertical cut impossible.
// Luminous gives a cleaner shield crop. Use it.
const SRC = `${ROOT}/upload/Luminous Lordsbook Shield Emblem.png`;

// Brand palette — matches the Lordsbook shield.
const NAVY = { r: 11, g: 20, b: 40, alpha: 1 };     // #0B1428 — deep navy
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  if (!existsSync(SRC)) {
    throw new Error(`Source logo not found: ${SRC}`);
  }
  console.log('Installing Lordsbook shield logo (from Luminous square source)…');

  // ── 1. Preserve the full lockup PNG verbatim (for OG/Twitter cards) ──
  await copyFile(SRC, `${ROOT}/public/lordsbook-logo.png`);
  console.log('  ✓ public/lordsbook-logo.png  (full lockup, 1254×1254, verbatim)');

  const srcBuf = await readFile(SRC);
  const meta = await sharp(srcBuf).metadata();
  const W = meta.width ?? 1254;
  const H = meta.height ?? 1254;

  // ── 2. Shield-only crop (TOP ~58% of the square source) ──
  // Per VLM analysis: shield occupies Y=7% to Y=63% of canvas, banner at
  // Y=60% to Y=86%. Banner is LAYERED ON TOP of shield, hiding the shield's
  // pointed tip AND the bottom of the cross's vertical bar (both extend to
  // Y=60-63%, behind the banner). Crop at Y=58% (top=5%, height=53%) to
  // exclude the banner entirely. The shield gets a flat-bottom cut and the
  // cross's very bottom tip is slightly trimmed — both imperceptible at
  // favicon/mobile-header sizes. This is the cleanest shield-only crop
  // possible from this source (the alternative is banner text bleed).
  // Horizontal: shield spans X=22% to X=78%, crop X=18% to X=82% for margin.
  const shieldCropLeft = Math.round(W * 0.18);
  const shieldCropWidth = Math.round(W * 0.64);   // 64% width — shield + small margin
  const shieldCropTop = Math.round(H * 0.05);     // 5% top margin (above shield's blue border)
  const shieldCropHeight = Math.round(H * 0.53);  // 53% height — clean shield, no banner

  const shieldBuf = await sharp(srcBuf)
    .extract({ left: shieldCropLeft, top: shieldCropTop, width: shieldCropWidth, height: shieldCropHeight })
    .toBuffer();
  await writeFile(`${ROOT}/public/lordsbook-shield.png`, shieldBuf);
  console.log(`  ✓ public/lordsbook-shield.png  (${shieldCropWidth}×${shieldCropHeight} shield crop, transparent)`);

  // ── 3. PWA manifest icons (192, 512) — transparent background ──
  for (const size of [192, 512]) {
    await sharp(shieldBuf)
      .resize(size, size, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(`${ROOT}/public/lordsbook-icon-${size}.png`);
    console.log(`  ✓ public/lordsbook-icon-${size}.png  (${size}×${size} PWA icon, transparent)`);
  }

  // ── 4. Apple touch icon (180×180, navy padded) ──
  // Apple touch icons look best with a solid background. Navy matches the
  // Lordsbook brand and matches the logo's dark background.
  await sharp(shieldBuf)
    .resize(140, 140, { fit: 'contain', background: TRANSPARENT })
    .extend({
      top: 20, bottom: 20, left: 20, right: 20,
      background: NAVY,
    })
    .flatten({ background: NAVY })
    .png()
    .toFile(`${ROOT}/public/apple-touch-icon.png`);
  console.log('  ✓ public/apple-touch-icon.png  (180×180, navy padded)');

  // ── 5. Small favicon PNGs (16, 32) — transparent ──
  for (const size of [16, 32]) {
    await sharp(shieldBuf)
      .resize(size, size, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(`${ROOT}/public/favicon-${size}.png`);
    console.log(`  ✓ public/favicon-${size}.png  (${size}×${size}, transparent)`);
  }

  // ── 6. Verify alpha channel is preserved in derivatives ──
  console.log('\nVerifying transparency preserved:');
  for (const file of ['lordsbook-shield.png', 'lordsbook-icon-192.png', 'favicon-32.png']) {
    const m = await sharp(`${ROOT}/public/${file}`).metadata();
    const corner = await sharp(`${ROOT}/public/${file}`)
      .extract({ left: 1, top: 1, width: 1, height: 1 })
      .raw()
      .toBuffer();
    console.log(`  ${file}: hasAlpha=${m.hasAlpha}, top-left pixel alpha=${corner[3] ?? 'N/A'}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
