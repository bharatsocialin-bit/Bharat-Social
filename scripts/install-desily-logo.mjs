// One-off Script: install the user's NEW Desily logo (wide landscape lockup).
//
// Source: /home/z/my-project/upload/Desily_ One India, Every Voice (2).png
//         (2172×724 RGBA PNG, transparent background, horizontal layout:
//          chakra-badge icon on the LEFT + "Desily" wordmark + tagline on
//          the RIGHT — different from the previous square logo)
//
// Outputs (all in /home/z/my-project/public/):
//   • desily-logo.png        — full lockup, landscape (2172×724, verbatim)
//   • desily-logo-wide.jpg   — wide landscape (1400×465, ivory padded)
//                              for sidebar/hero where wider-than-source is
//                              needed (currently same as source aspect)
//   • desily-icon.png        — icon-only crop (LEFT ~28% of source)
//   • desily-icon-192.png    — PWA manifest size
//   • desily-icon-512.png    — PWA manifest size
//   • apple-touch-icon.png   — iOS home-screen icon (180×180, navy padded)
//   • favicon-32.png         — browser tab icon (32×32)
//   • favicon-16.png         — browser tab icon (16×16)
//
// Source PNG is RGBA with alpha=0 at all 4 corners (verified). All
// derivatives preserve transparency so the icon renders cleanly on BOTH
// light and dark backgrounds — no white-box-on-dark-sidebar issue.

import sharp from 'sharp';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const SRC = `${ROOT}/upload/Desily_ One India, Every Voice (2).png`;

const NAVY = { r: 11, g: 37, b: 69, alpha: 1 };     // #0B2545
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  if (!existsSync(SRC)) {
    throw new Error(`Source logo not found: ${SRC}`);
  }
  console.log('Installing user-provided Desily logo (NEW wide landscape version)…');

  // ── 1. Preserve the full lockup PNG verbatim ──
  await copyFile(SRC, `${ROOT}/public/desily-logo.png`);
  console.log('  ✓ public/desily-logo.png  (full lockup, 2172×724, verbatim)');

  const srcBuf = await readFile(SRC);
  const meta = await sharp(srcBuf).metadata();
  const W = meta.width ?? 2172;
  const H = meta.height ?? 724;

  // ── 2. Wide landscape version (1400×465) for desktop sidebar / hero ──
  // The source is already 3:1 landscape; we just resize it to 1400px wide.
  // No padding needed since the source is already the right aspect ratio.
  await sharp(srcBuf)
    .resize(1400, Math.round(1400 * H / W), { fit: 'fill' })
    .png() // keep PNG to preserve transparency (jpg can't have alpha)
    .toFile(`${ROOT}/public/desily-logo-wide.png`);
  console.log(`  ✓ public/desily-logo-wide.png  (1400×${Math.round(1400 * H / W)} wide lockup)`);

  // ── 3. Icon-only crop (LEFT portion of the wide source, full height) ──
  // The icon (chakra badge + ribbons + 3 dots) occupies the LEFT portion of
  // the wide lockup. Pixel-scan of the source revealed:
  //   - Icon content extends from x=0 to x=790 (ribbons, dots, chakra)
  //   - Clean gap at x=770 (zero non-transparent pixels — internal icon space)
  //   - Wordmark "Desily" begins at x=800 (white pixels)
  // Perfect crop boundary = x=795 (5px safety margin before wordmark).
  // For sources of different dimensions, this scales to ~36.6% of width.
  const iconCropLeft = 0;
  const iconCropWidth = Math.min(Math.round(W * 0.366), 795); // ~36.6% or x=795, whichever smaller
  const iconCropTop = 0;
  const iconCropHeight = H; // full height — preserves ribbon tips top + bottom

  const iconBuf = await sharp(srcBuf)
    .extract({ left: iconCropLeft, top: iconCropTop, width: iconCropWidth, height: iconCropHeight })
    .toBuffer();
  await writeFile(`${ROOT}/public/desily-icon.png`, iconBuf);
  console.log(`  ✓ public/desily-icon.png  (${iconCropWidth}×${iconCropHeight} icon crop, full height)`);

  // ── 4. PWA manifest icons (192, 512) — transparent background ──
  for (const size of [192, 512]) {
    await sharp(iconBuf)
      .resize(size, size, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(`${ROOT}/public/desily-icon-${size}.png`);
    console.log(`  ✓ public/desily-icon-${size}.png  (${size}×${size} PWA icon, transparent bg)`);
  }

  // ── 5. Apple touch icon (180×180, navy padded) ──
  // Apple touch icons look best with a solid background. Navy matches brand.
  // Icon is centered on a 180×180 navy canvas with ~20px padding.
  await sharp(iconBuf)
    .resize(140, 140, { fit: 'contain', background: TRANSPARENT })
    .extend({
      top: 20, bottom: 20, left: 20, right: 20,
      background: NAVY,
    })
    .flatten({ background: NAVY })
    .png()
    .toFile(`${ROOT}/public/apple-touch-icon.png`);
  console.log('  ✓ public/apple-touch-icon.png  (180×180, navy padded)');

  // ── 6. Small favicon PNGs (16, 32) — transparent ──
  for (const size of [16, 32]) {
    await sharp(iconBuf)
      .resize(size, size, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(`${ROOT}/public/favicon-${size}.png`);
    console.log(`  ✓ public/favicon-${size}.png  (${size}×${size}, transparent)`);
  }

  // ── 7. Verify alpha channel is preserved in derivatives ──
  console.log('\nVerifying transparency preserved:');
  for (const file of ['desily-icon.png', 'desily-icon-192.png', 'favicon-32.png']) {
    const m = await sharp(`${ROOT}/public/${file}`).metadata();
    const corner = await sharp(`${ROOT}/public/${file}`)
      .extract({ left: 1, top: 1, width: 1, height: 1 })
      .raw()
      .toBuffer();
    console.log(`  ${file}: hasAlpha=${m.hasAlpha}, top-left pixel alpha=${corner[3] ?? 'N/A'}`);
  }

  console.log('\nDone. Next: visually verify with VLM, then update Logo.tsx.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
