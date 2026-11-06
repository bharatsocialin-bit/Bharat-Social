import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { getStorageAdminClient } from '@/lib/supabase/storage';
import { supabaseConfig } from '@/lib/supabase/server';

/**
 * Comic artwork storage (Admin CMS — feature: Comic Bible Admin CMS).
 *
 * PRODUCTION (the real path): original artwork is uploaded to the public
 * `comics` Supabase Storage bucket with the service-role client, exactly
 * like the `avatars` bucket flow in @/lib/supabase/storage. The returned
 * public URL is stored in ComicPage.imagePath / ComicStory.coverImagePath —
 * the reader renders <img src={imagePath}> directly, so no React component
 * ever hardcodes an uploaded image path.
 *
 * SANDBOX FALLBACK: when Supabase is not configured (no service key), files
 * are written under public/uploads/comics/… and served as static assets —
 * the same dev fallback the Shorts feature uses. The DB contract (a URL in
 * imagePath) is identical in both modes.
 *
 * QUALITY RULE: the original buffer is stored byte-for-byte. Nothing in
 * this module recompresses or resizes artwork. sharp is used ONLY to read
 * metadata (dimensions) for the CMS UI.
 */

export const COMICS_BUCKET = 'comics';
/** 25 MB per artwork file — generous room for print-quality pages. */
export const COMIC_MAX_BYTES = 25 * 1024 * 1024;

/** Site-relative prefix of the dev fallback location. */
export const LOCAL_COMICS_URL_PREFIX = '/uploads/comics';
/** Absolute directory of the dev fallback location. */
const LOCAL_COMICS_DIR = path.join(process.cwd(), 'public', 'uploads', 'comics');

/** Legacy repo-shipped artwork (e.g. /comics/pages/david-goliath-spread-1.png).
 *  These paths are part of the git repository — the CMS must never delete them. */
const REPO_STATIC_PREFIX = '/comics/';

export function isRepoStaticArtwork(imagePath: string): boolean {
  return imagePath.startsWith(REPO_STATIC_PREFIX);
}

export interface ComicImageMeta {
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  width: number | null;
  height: number | null;
}

/**
 * Detect the real image type from magic bytes (authoritative — the browser
 * supplied file.type is only a hint) and read intrinsic dimensions.
 * Returns null when the buffer is not a supported image at all.
 */
export async function readComicImageMeta(buffer: Buffer): Promise<ComicImageMeta | null> {
  const { detectImageMime } = await import('@/lib/supabase/storage');
  const mime = detectImageMime(buffer);
  if (!mime) return null;

  let width: number | null = null;
  let height: number | null = null;
  try {
    const meta = await sharp(buffer, { failOn: 'none' }).metadata();
    if (typeof meta.width === 'number' && typeof meta.height === 'number') {
      width = meta.width;
      height = meta.height;
    }
  } catch {
    // Dimensions are display metadata only — never fail an upload over them.
  }
  return { mime, width, height };
}

// ── Bucket bootstrap (service-key path only) ───────────────────────────────

/** Create the comics bucket if missing. Best-effort; errors are logged. */
export async function ensureComicsBucket(admin: SupabaseClient): Promise<void> {
  try {
    const { data: existing } = await admin.storage.getBucket(COMICS_BUCKET);
    if (existing) return;
    await admin.storage.createBucket(COMICS_BUCKET, {
      public: true,
      fileSizeLimit: COMIC_MAX_BYTES,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
  } catch (error) {
    console.error('ensureComicsBucket failed:', error);
  }
}

// ── Upload ─────────────────────────────────────────────────────────────────

export interface StoredArtwork {
  /** URL to store in the DB and render with <img src>: absolute Supabase
   *  public URL, or a site-relative /uploads/comics/… path in dev fallback. */
  url: string;
  /** Backend the file actually landed on (stored alongside for debugging). */
  storage: 'supabase' | 'local';
}

const EXT_BY_MIME: Record<ComicImageMeta['mime'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function objectKey(storyId: string, kind: 'covers' | 'pages', mime: ComicImageMeta['mime']): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `stories/${storyId}/${kind}/${Date.now()}-${suffix}.${EXT_BY_MIME[mime]}`;
}

/**
 * Upload one comic artwork file. Throws Error with a user-safe message on
 * failure. `storyId` comes from the verified DB row (never client text).
 */
export async function uploadComicArtwork(
  storyId: string,
  kind: 'covers' | 'pages',
  buffer: Buffer,
  mime: ComicImageMeta['mime'],
): Promise<StoredArtwork> {
  const admin = getStorageAdminClient();
  if (admin) {
    await ensureComicsBucket(admin);
    const key = objectKey(storyId, kind, mime);
    const { error } = await admin.storage.from(COMICS_BUCKET).upload(key, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(`Artwork upload failed: ${error.message}`);
    const config = supabaseConfig();
    if (!config) throw new Error('Artwork upload failed: storage not configured.');
    return {
      url: `${config.url}/storage/v1/object/public/${COMICS_BUCKET}/${key}`,
      storage: 'supabase',
    };
  }

  // Dev fallback — local filesystem under public/uploads/comics/.
  const key = objectKey(storyId, kind, mime);
  const absPath = path.join(LOCAL_COMICS_DIR, key);
  await promisify(fs.mkdir)(path.dirname(absPath), { recursive: true });
  await promisify(fs.writeFile)(absPath, buffer);
  return { url: `${LOCAL_COMICS_URL_PREFIX}/${key}`, storage: 'local' };
}

// ── Delete ─────────────────────────────────────────────────────────────────

/**
 * Delete an artwork object by its stored URL/path. Never throws — a failed
 * cleanup must not fail the admin operation (orphans can be reaped later).
 * Repo-shipped static artwork (public/comics/…) is NEVER touched.
 */
export async function deleteComicArtwork(imagePath: string | null | undefined): Promise<void> {
  if (!imagePath) return;
  try {
    if (isRepoStaticArtwork(imagePath)) return;

    if (imagePath.startsWith(`${LOCAL_COMICS_URL_PREFIX}/`)) {
      const rel = imagePath.slice(LOCAL_COMICS_URL_PREFIX.length); // /stories/…
      const abs = path.join(LOCAL_COMICS_DIR, rel);
      if (fs.existsSync(abs)) await promisify(fs.unlink)(abs);
      return;
    }

    const marker = `/storage/v1/object/public/${COMICS_BUCKET}/`;
    const idx = imagePath.indexOf(marker);
    if (idx !== -1) {
      const key = imagePath.slice(idx + marker.length).split('?')[0];
      const admin = getStorageAdminClient();
      if (admin) await admin.storage.from(COMICS_BUCKET).remove([key]);
    }
  } catch (error) {
    console.error('deleteComicArtwork failed (non-fatal):', error);
  }
}

// ── Reachability (publish validation) ──────────────────────────────────────

/**
 * Verify that an artwork URL actually resolves — "never allow missing or
 * broken artwork to be published".
 *  - Repo static + dev-fallback paths: file must exist under public/.
 *  - Supabase URLs: HTTP HEAD must return 2xx (5s timeout).
 */
export async function checkArtworkReachable(imagePath: string): Promise<boolean> {
  if (imagePath.startsWith('/')) {
    const abs = path.join(process.cwd(), 'public', imagePath);
    try {
      return fs.existsSync(abs) && fs.statSync(abs).size > 0;
    } catch {
      return false;
    }
  }
  // Absolute URL (Supabase or other CDN) — HEAD probe.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(imagePath, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
