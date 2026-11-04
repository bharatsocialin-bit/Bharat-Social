// One-off Script: install the Lordsbook shield logo (NEW shield-only source).
//
// Sources:
//   • Shield-only:  upload/Glowing Golden Cross Shield.png (1254×1254 RGBA)
//                   Pure shield emblem with NO banner — clean crop, full
//                   pointed tip preserved. Used for the icon/mark.
//   • Full lockup:  upload/Glossy LORDSBOOK Shield Emblem (1).png (2172×724 RGBA)
//                   Shield + "LORDSBOOK" banner. Used verbatim for OG/Twitter
//                   cards and the LogoSquare component (auth/onboarding).
//
// Outputs (all in /home/z/my-project/public/):
//   • lordsbook-shield.png     — full shield from shield-only source (transparent)
//   • lordsbook-logo.png       — full lockup (shield + banner) for OG/Twitter
//   • lordsbook-icon-192.png   — PWA manifest size
//   • lordsbook-icon-512.png   — PWA manifest size
//   • apple-touch-icon.png     — iOS home-screen icon (180×180, navy padded)
//   • favicon-16.png           — browser tab icon (16×16)
//   • favicon-32.png           — browser tab icon (32×32)
//
// All derivatives preserve transparency so the shield renders cleanly on
// BOTH light and dark backgrounds. The shield-only source has content at
// x=7.5%-92.2%, y=0.6%-97.9% (verified) — no banner to cut around.

import sharp from 'sharp';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const SHIELD_SRC = `${ROOT}/upload/Glowing Golden Cross Shield.png`;
const LOCKUP_SRC = `${ROOT}/upload/Glossy LORDSBOOK Shield Emblem (1).png`;

// Brand palette — matches the Lordsbook shield.
const NAVY = { r: 11, g: 20, b: 40, alpha: 1 };     // #0B1428 — deep navy
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  if (!existsSync(SHIELD_SRC)) {
    throw new Error(`Shield source not found: ${SHIELD_SRC}`);
  }
  if (!existsSync(LOCKUP_SRC)) {
    throw new Error(`Lockup source not found: ${LOCKUP_SRC}`);
  }
  console.log('Installing Lordsbook logo (NEW shield-only source + full lockup)…');

  // ── 1. Preserve the full lockup PNG verbatim (for OG/Twitter cards) ──
  await copyFile(LOCKUP_SRC, `${ROOT}/public/lordsbook-logo.png`);
  console.log('  ✓ public/lordsbook-logo.png  (full lockup, 2172×724, verbatim)');

  // ── 2. Shield-only source → use directly (no crop needed) ──
  // The shield-only source is already a clean shield emblem with no banner.
  // Content spans x=7.5%-92.2%, y=0.6%-97.9% — the small transparent margins
  // are perfect for an icon (no tight edge touching). Use it verbatim.
  await copyFile(SHIELD_SRC, `${ROOT}/public/lordsbook-shield.png`);
  console.log('  ✓ public/lordsbook-shield.png  (1254×1254 shield, verbatim from shield-only source)');

  const shieldBuf = await readFile(SHIELD_SRC);

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
