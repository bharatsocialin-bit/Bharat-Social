// One-off Script: install the Lordsbook logo suite (3 sources → 8 derivatives).
//
// Sources (all user-provided):
//   • Shield-only:  upload/Glowing Golden Cross Shield.png (1254×1254 RGBA)
//                   Pure shield emblem with NO banner — clean icon. Used for
//                   LogoMark (mobile header, collapsed sidebar, favicon).
//   • Wide lockup:  upload/Glossy LORDSBOOK Shield Emblem (1).png (2172×724 RGBA)
//                   Shield LEFT + "LORDSBOOK" banner RIGHT (landscape). Used
//                   for LogoFull (desktop sidebar) + OG/Twitter cards.
//   • Stacked lockup: upload/Luminous Lordsbook Shield Emblem.png (1254×1254 RGBA)
//                     Shield TOP + "LORDSBOOK" banner BOTTOM (square). Used
//                     for LogoSquare (auth dialog, onboarding, about pages).
//
// Outputs (all in /home/z/my-project/public/):
//   • lordsbook-shield.png         — shield-only (1254×1254, transparent)
//   • lordsbook-logo.png           — wide lockup (2172×724, transparent)
//   • lordsbook-logo-stacked.png   — stacked lockup (1254×1254, transparent)
//   • lordsbook-icon-192.png       — PWA manifest size
//   • lordsbook-icon-512.png       — PWA manifest size
//   • apple-touch-icon.png         — iOS home-screen icon (180×180, navy padded)
//   • favicon-16.png               — browser tab icon (16×16)
//   • favicon-32.png               — browser tab icon (32×32)
//
// All derivatives preserve transparency so the shield renders cleanly on
// BOTH light and dark backgrounds.

import sharp from 'sharp';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const SHIELD_SRC = `${ROOT}/upload/Glowing Golden Cross Shield.png`;
const LOCKUP_SRC = `${ROOT}/upload/Glossy LORDSBOOK Shield Emblem (1).png`;
const STACKED_SRC = `${ROOT}/upload/Luminous Lordsbook Shield Emblem.png`;

// Brand palette — matches the Lordsbook shield.
const NAVY = { r: 11, g: 20, b: 40, alpha: 1 };     // #0B1428 — deep navy
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  if (!existsSync(SHIELD_SRC)) throw new Error(`Shield source not found: ${SHIELD_SRC}`);
  if (!existsSync(LOCKUP_SRC)) throw new Error(`Lockup source not found: ${LOCKUP_SRC}`);
  if (!existsSync(STACKED_SRC)) throw new Error(`Stacked source not found: ${STACKED_SRC}`);
  console.log('Installing Lordsbook logo suite (3 sources → 8 derivatives)…');

  // ── 1. Wide lockup PNG verbatim (for OG/Twitter + LogoFull) ──
  await copyFile(LOCKUP_SRC, `${ROOT}/public/lordsbook-logo.png`);
  console.log('  ✓ public/lordsbook-logo.png  (wide lockup, 2172×724, verbatim)');

  // ── 2. Stacked lockup PNG verbatim (for LogoSquare — auth/onboarding) ──
  await copyFile(STACKED_SRC, `${ROOT}/public/lordsbook-logo-stacked.png`);
  console.log('  ✓ public/lordsbook-logo-stacked.png  (stacked lockup, 1254×1254, verbatim)');

  // ── 3. Shield-only source → use directly (no crop needed) ──
  await copyFile(SHIELD_SRC, `${ROOT}/public/lordsbook-shield.png`);
  console.log('  ✓ public/lordsbook-shield.png  (1254×1254 shield, verbatim)');

  const shieldBuf = await readFile(SHIELD_SRC);

  // ── 4. PWA manifest icons (192, 512) — transparent background ──
  for (const size of [192, 512]) {
    await sharp(shieldBuf)
      .resize(size, size, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(`${ROOT}/public/lordsbook-icon-${size}.png`);
    console.log(`  ✓ public/lordsbook-icon-${size}.png  (${size}×${size} PWA icon, transparent)`);
  }

  // ── 5. Apple touch icon (180×180, navy padded) ──
  await sharp(shieldBuf)
    .resize(140, 140, { fit: 'contain', background: TRANSPARENT })
    .extend({ top: 20, bottom: 20, left: 20, right: 20, background: NAVY })
    .flatten({ background: NAVY })
    .png()
    .toFile(`${ROOT}/public/apple-touch-icon.png`);
  console.log('  ✓ public/apple-touch-icon.png  (180×180, navy padded)');

  // ── 6. Small favicon PNGs (16, 32) — transparent ──
  for (const size of [16, 32]) {
    await sharp(shieldBuf)
      .resize(size, size, { fit: 'contain', background: TRANSPARENT })
      .png()
      .toFile(`${ROOT}/public/favicon-${size}.png`);
    console.log(`  ✓ public/favicon-${size}.png  (${size}×${size}, transparent)`);
  }

  // ── 7. Verify alpha channel is preserved ──
  console.log('\nVerifying transparency preserved:');
  for (const file of ['lordsbook-shield.png', 'lordsbook-logo.png', 'lordsbook-logo-stacked.png', 'lordsbook-icon-192.png', 'favicon-32.png']) {
    const m = await sharp(`${ROOT}/public/${file}`).metadata();
    const corner = await sharp(`${ROOT}/public/${file}`)
      .extract({ left: 1, top: 1, width: 1, height: 1 })
      .raw()
      .toBuffer();
    console.log(`  ${file}: ${m.width}×${m.height}, hasAlpha=${m.hasAlpha}, top-left alpha=${corner[3] ?? 'N/A'}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
