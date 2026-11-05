// One-off script: rasterize the Desily SVG logos into PNG assets that
// legacy consumers (Apple touch icon, OG image fallbacks, email headers)
// still expect. Idempotent — overwrites if present.
//
// Run with:  node scripts/generate-desily-pngs.mjs

import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();

async function svgToPng(svgPath, pngPath, width, height) {
  const svg = await readFile(svgPath);
  const buf = await sharp(svg, { density: 384 })
    .resize(width, height, { fit: 'contain', background: { r: 255, g: 253, b: 247, alpha: 1 } })
    .png()
    .toBuffer();
  await writeFile(pngPath, buf);
  console.log(`  ✓ ${pngPath}  (${width}×${height})`);
}

async function main() {
  console.log('Generating Desily PNG assets…');

  // 1. Apple touch icon — 180×180, full-bleed icon on navy background.
  //    Built directly from favicon.svg (which already has the navy rounded-square bg).
  if (existsSync(`${ROOT}/public/favicon.svg`)) {
    const svg = await readFile(`${ROOT}/public/favicon.svg`);
    // Render favicon.svg at 180×180 (it already has the navy background).
    const buf = await sharp(svg, { density: 384 })
      .resize(180, 180, { fit: 'cover' })
      .png()
      .toBuffer();
    await writeFile(`${ROOT}/public/apple-touch-icon.png`, buf);
    console.log(`  ✓ public/apple-touch-icon.png  (180×180)`);
  }

  // 2. Wide horizontal logo PNG (600×200) — for sidebar / hero / OG fallback.
  await svgToPng(
    `${ROOT}/public/desily-logo.svg`,
    `${ROOT}/public/desily-logo.png`,
    1200,
    400,
  );

  // 3. Icon-only PNG (512×512) — for PWA manifest / app icon.
  await svgToPng(
    `${ROOT}/public/desily-icon.svg`,
    `${ROOT}/public/desily-icon-512.png`,
    512,
    512,
  );

  // 4. Icon-only PNG (192×192) — PWA manifest.
  await svgToPng(
    `${ROOT}/public/desily-icon.svg`,
    `${ROOT}/public/desily-icon-192.png`,
    192,
    192,
  );

  console.log('Done.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
