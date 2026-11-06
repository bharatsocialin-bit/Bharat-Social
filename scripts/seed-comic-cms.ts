/**
 * Seed the LOCAL DEV database for Comic Bible CMS verification.
 *
 * ── SECURITY GUARDRAILS ──────────────────────────────────────────────────
 * This script is STRICTLY local-development-only. It will REFUSE to run unless
 * ALL of the following are true:
 *
 *   1. The environment variable COMIC_CMS_DEV_SEED is set to exactly "1".
 *      (This is an explicit opt-in — the script never runs by accident.)
 *
 *   2. DATABASE_URL is a SQLite file: URL (file:...) or points at 127.0.0.1 /
 *      localhost. It will REFUSE to run against any remote/production Postgres
 *      or Supabase connection string.
 *
 *   3. The script NEVER resets an existing user's password or suspension
 *      status. It only CREATES the local dev admin if the account does not
 *      exist yet. If the account already exists, it is left untouched.
 *
 *   4. The admin password is NOT hardcoded — a random password is generated
 *      and printed to the console once. It is never written to a file.
 *
 * This script does NOT create or promote the primary Super Admin account
 * (lordsbook.admin@gmail.com). That is done separately via
 * scripts/promote-super-admin.ts, which verifies the real Supabase Auth
 * identity before promoting.
 *
 * ── WHAT THIS SCRIPT DOES ────────────────────────────────────────────────
 *   1. Creates a LOCAL-ONLY dev admin user (only if it doesn't exist).
 *   2. Seeds the David and Goliath story wired to its real existing artwork
 *      asset (public/comics/pages/david-goliath-spread-1.png), exactly ONE
 *      pre-composed two-page spread — page count stays truthful.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';

const db = new PrismaClient();

// Parse PNG IHDR for the intrinsic dimensions of the existing artwork.
function pngSize(path: string): { width: number; height: number } {
  const buf = fs.readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Generate a random 24-char base64 password (dev-only). */
function generateDevPassword(): string {
  return crypto.randomBytes(18).toString('base64');
}

/**
 * Verify this is a local dev database. Refuse to run against production.
 * Allows: file:... (SQLite), postgresql://...@127.0.0.1, ...@localhost
 */
function assertLocalDevDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error('DATABASE_URL is not set. This script requires a local dev database.');
  }

  // SQLite local file — OK
  if (url.startsWith('file:')) return;

  // Postgres — only allow 127.0.0.1 / localhost
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    const hostMatch = url.match(/@([^:/]+)/);
    const host = hostMatch?.[1] ?? '';
    if (host === '127.0.0.1' || host === 'localhost' || host === '::1') return;
    throw new Error(
      `REFUSING to run: DATABASE_URL points at host "${host}" which is not localhost. ` +
      'This seed script is local-dev-only. Use scripts/promote-super-admin.ts for production.',
    );
  }

  throw new Error(
    `REFUSING to run: DATABASE_URL "${url.slice(0, 30)}…" is not a recognized local dev URL. ` +
    'Allowed: file:... (SQLite) or postgresql://...@127.0.0.1/localhost',
  );
}

/** Verify the explicit dev-seed opt-in flag is set. */
function assertDevSeedFlag(): void {
  if (process.env.COMIC_CMS_DEV_SEED !== '1') {
    throw new Error(
      'REFUSING to run: COMIC_CMS_DEV_SEED is not set to "1".\n' +
      'This script is local-dev-only and requires explicit opt-in.\n' +
      'Usage: COMIC_CMS_DEV_SEED=1 npx tsx scripts/seed-comic-cms.ts',
    );
  }
}

const DEV_ADMIN_EMAIL = 'dev-admin@localhost';
const DEV_ADMIN_USERNAME = 'dev_admin';
const STORY_ID = 'comic-david-goliath';
const SPREAD_PATH = '/comics/pages/david-goliath-spread-1.png';

async function main() {
  // ── Guardrails — refuse to run against production ──
  assertDevSeedFlag();
  assertLocalDevDatabase();

  // ── 1. Local dev admin user (CREATE-ONLY, never upsert/reset) ─────────
  // If the account already exists, leave it completely untouched — no
  // password reset, no role change, no suspension change.
  let admin = await db.user.findUnique({ where: { email: DEV_ADMIN_EMAIL } });
  if (admin) {
    console.log(`dev admin already exists: ${admin.id} — leaving untouched (no password reset, no role change).`);
  } else {
    const devPassword = generateDevPassword();
    const passwordHash = bcrypt.hashSync(devPassword, 10);
    admin = await db.user.create({
      data: {
        email: DEV_ADMIN_EMAIL,
        username: DEV_ADMIN_USERNAME,
        name: 'Local Dev Admin',
        passwordHash,
        role: 'admin',
        initials: 'DA',
      },
    });
    console.log('────────────────────────────────────────────────────────────');
    console.log(' LOCAL DEV ADMIN CREATED (local-dev-only, not for production)');
    console.log('────────────────────────────────────────────────────────────');
    console.log(`  email    : ${admin.email}`);
    console.log(`  username : ${admin.username}`);
    console.log(`  password : ${devPassword}`);
    console.log('  (This password is shown once. It is NOT the Super Admin.)');
    console.log('  (For the real Super Admin, use scripts/promote-super-admin.ts)');
    console.log('────────────────────────────────────────────────────────────');
  }

  // ── 2. David and Goliath story (real artwork, 1 spread asset) ─────────
  const artworkAbs = `public${SPREAD_PATH}`;
  if (!fs.existsSync(artworkAbs)) {
    throw new Error(`Artwork not found: ${artworkAbs}. Place david-goliath-spread-1.png in public/comics/pages/ first.`);
  }
  const dims = pngSize(artworkAbs);
  const fileSize = fs.statSync(artworkAbs).size;

  const story = await db.comicStory.upsert({
    where: { id: STORY_ID },
    update: {
      coverImagePath: SPREAD_PATH,
    },
    create: {
      id: STORY_ID,
      title: 'David and Goliath: Faithful Victory',
      testament: 'OT',
      category: 'David and Goliath',
      bibleBook: '1SA',
      bibleChapter: 17,
      bibleVerse: 45,
      coverImagePath: SPREAD_PATH,
      description:
        'A young shepherd boy faces the giant Goliath with nothing but a sling and unshakeable faith in God. This is the timeless story of how true victory comes not from strength or size, but from trusting in the Lord.',
      keyVerse: 'Victory does not come from strength or size, but from faith in God.',
      keyVerseRef: '1 Samuel 17:45',
      lesson:
        'David\'s victory over Goliath teaches us that no challenge is too big when we trust in God. The world measures strength by weapons and size, but God looks at the heart. When we face our own "giants" — fear, doubt, temptation — we can remember that the battle belongs to the Lord.',
      prayer:
        'Lord, give me courage like David to face the giants in my life. Help me to trust that You are bigger than any challenge I face. In Jesus\' name, Amen.',
      isKidsFriendly: true,
      ageGroup: '6-8',
      pageLayout: 'spread',
      status: 'draft',
      published: false,
      sortOrder: 1,
    },
  });

  // Page 1 = the pre-composed two-page spread (the ONLY real asset).
  const existingPage = await db.comicPage.findUnique({
    where: { storyId_pageNumber: { storyId: STORY_ID, pageNumber: 1 } },
  });
  if (existingPage) {
    await db.comicPage.update({
      where: { id: existingPage.id },
      data: { imagePath: SPREAD_PATH, isSpread: true, ...dims, fileSize, originalName: 'david-goliath-spread-1.png' },
    });
  } else {
    await db.comicPage.create({
      data: {
        storyId: STORY_ID,
        pageNumber: 1,
        imagePath: SPREAD_PATH,
        isSpread: true,
        ...dims,
        fileSize,
        originalName: 'david-goliath-spread-1.png',
      },
    });
  }

  await db.comicTranslation.upsert({
    where: { storyId_languageCode: { storyId: STORY_ID, languageCode: 'en' } },
    update: {},
    create: {
      storyId: STORY_ID,
      languageCode: 'en',
      title: 'David and Goliath: Faithful Victory',
      introduction:
        'The Philistine giant Goliath challenges the armies of Israel. No soldier dares to face him — until a young shepherd boy named David steps forward, armed only with a sling and unshakeable faith in the living God.',
      narration:
        'David said to the Philistine, "You come against me with sword and spear and javelin, but I come against you in the name of the Lord Almighty." — 1 Samuel 17:45',
      scripture: '1 Samuel 17:45',
      status: 'draft',
    },
  });

  const pageCount = await db.comicPage.count({ where: { storyId: STORY_ID } });
  console.log(`story ready: ${story.id} (status=${story.status}) — ${pageCount} real asset(s), spread ${dims.width}x${dims.height}, ${(fileSize / 1024).toFixed(0)} KB`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
