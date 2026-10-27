import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './server';
import {
  detectImageMime,
  type AllowedImageMime,
} from './storage';

/**
 * Supabase Storage helpers for User Stories (India Pulse — Instagram-style
 * 24h stories).
 *
 * Mirrors the avatar storage pattern (see src/lib/supabase/storage.ts) but
 * uses a SEPARATE bucket so story media can have its own size limits, MIME
 * allowlist, and retention policy.
 *
 *   Path convention: bucket-relative "<owner-id>/<story-id>-<kind>-<rand>.<ext>"
 *
 * Bucket: `user-stories`
 *   - Public-read (so anonymous viewers can see stories)
 *   - 10 MB image cap, 50 MB video cap
 *   - RLS: owner-scoped writes, public reads
 */

export const STORY_BUCKET = 'user-stories';
export const STORY_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const STORY_VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_STORY_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type AllowedStoryImageMime = (typeof ALLOWED_STORY_IMAGE_MIMES)[number];

export const ALLOWED_STORY_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;
export type AllowedStoryVideoMime = (typeof ALLOWED_STORY_VIDEO_MIMES)[number];

const IMAGE_EXT_BY_MIME: Record<AllowedStoryImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const VIDEO_EXT_BY_MIME: Record<AllowedStoryVideoMime, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

// ── URL / path helpers ─────────────────────────────────────────────────────

/**
 * Public URL for a bucket-relative object path like "<uid>/story-…jpg".
 * The bucket segment is added here — never reuse the same string verbatim
 * after /object/public/ (would double-prefix and 404).
 */
export function storyPublicUrlFor(objectPath: string): string | null {
  const config = supabaseConfig();
  if (!config) return null;
  if (objectPath.startsWith(`${STORY_BUCKET}/`)) {
    // Defensive: tolerate legacy pre-prefixed paths.
    objectPath = objectPath.slice(STORY_BUCKET.length + 1);
  }
  return `${config.url}/storage/v1/object/public/${STORY_BUCKET}/${objectPath}`;
}

/**
 * Extract the storage object path from a stored public URL. Returns null
 * when the URL does not point into our story bucket — callers must NOT
 * delete anything in that case (defends against a tampered mediaUrl
 * deleting arbitrary objects).
 */
export function storyObjectPathFromPublicUrl(
  mediaUrl: string | null | undefined,
): string | null {
  if (!mediaUrl) return null;
  const marker = '/storage/v1/object/public/';
  const idx = mediaUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = mediaUrl.slice(idx + marker.length).split('?')[0];
  if (!raw.startsWith(`${STORY_BUCKET}/`)) return null;
  return raw.slice(STORY_BUCKET.length + 1);
}

// ── Bucket bootstrap (service-key path only) ───────────────────────────────

/** Create the user-stories bucket if missing. Best-effort; errors logged. */
export async function ensureStoryBucket(admin: SupabaseClient): Promise<void> {
  try {
    const { data: existing } = await admin.storage.getBucket(STORY_BUCKET);
    if (existing) return;
    // Allow both images and videos. Supabase bucket MIME filter is an
    // allowlist, so we list every accepted type. Per-type size caps are
    // enforced by the route (server-side), not the bucket itself, because
    // Supabase buckets only accept a single fileSizeLimit.
    await admin.storage.createBucket(STORY_BUCKET, {
      public: true,
      fileSizeLimit: STORY_VIDEO_MAX_BYTES, // use the larger cap
      allowedMimeTypes: [...ALLOWED_STORY_IMAGE_MIMES, ...ALLOWED_STORY_VIDEO_MIMES],
    });
  } catch (error) {
    console.error('ensureStoryBucket failed:', error);
  }
}

// ── File-type sniffing ─────────────────────────────────────────────────────

/**
 * Detect the real image type from magic bytes. Returns null for anything
 * that is not one of our allowed formats.
 */
export function detectStoryImageMime(
  buffer: Buffer,
): AllowedStoryImageMime | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Detect the real video type from magic bytes. Returns null for anything
 * that is not one of our allowed formats.
 *
 * NOTE: This is a coarse check. The browser-declared MIME is also accepted
 * as a hint for video because robust format detection requires reading
 * multiple box headers (mp4) or chunk headers (webm). The route validates
 * the declared MIME against the allowlist and re-checks the file size.
 */
export function detectStoryVideoMime(
  buffer: Buffer,
  declaredMime: string | null,
): AllowedStoryVideoMime | null {
  // MP4: atoms start with "ftyp" at offset 4
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
  ) {
    return 'video/mp4';
  }
  // WebM: EBML header 0x1A 0x45 0xDF 0xA3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3
  ) {
    return 'video/webm';
  }
  // QuickTime: "moov" or "mdat" atoms, or starts with "free"/"wide"
  // Often starts with 00 00 00 XX 6D 6F 6F 76 (size + "moov")
  if (
    buffer.length >= 8 &&
    (buffer.subarray(4, 8).toString('latin1') === 'moov' ||
      buffer.subarray(4, 8).toString('latin1') === 'mdat' ||
      buffer.subarray(4, 8).toString('latin1') === 'free' ||
      buffer.subarray(4, 8).toString('latin1') === 'wide')
  ) {
    return 'video/quicktime';
  }
  // Fall back to the declared MIME if magic bytes didn't match but the
  // declared type is one of our allowed types.
  if (declaredMime) {
    for (const allowed of ALLOWED_STORY_VIDEO_MIMES) {
      if (declaredMime === allowed) return allowed;
    }
  }
  return null;
}

// Reuse the avatar image detector for any common image checks.
export { detectImageMime };

// ── Upload / delete primitives ─────────────────────────────────────────────

export interface StoredStoryMedia {
  /** Full persistent public URL to store on the UserStory row. */
  publicUrl: string;
  /** Bucket-relative object path, e.g. "<uid>/story-…jpg". */
  objectPath: string;
}

/**
 * Upload story media via the service-role admin client. `folderOwnerId`
 * MUST come from the verified server session.
 */
export async function uploadStoryMediaAsAdmin(
  admin: SupabaseClient,
  folderOwnerId: string,
  buffer: Buffer,
  mime: AllowedStoryImageMime | AllowedStoryVideoMime,
  kind: 'photo' | 'video',
): Promise<StoredStoryMedia> {
  const ext =
    kind === 'photo'
      ? IMAGE_EXT_BY_MIME[mime as AllowedStoryImageMime]
      : VIDEO_EXT_BY_MIME[mime as AllowedStoryVideoMime];
  const suffix = Math.random().toString(36).slice(2, 8);
  const objectPath = `${folderOwnerId}/story-${Date.now()}-${suffix}.${ext}`;

  const { error } = await admin.storage.from(STORY_BUCKET).upload(objectPath, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`upload_failed: ${error.message}`);

  const publicUrl = storyPublicUrlFor(objectPath);
  if (!publicUrl) throw new Error('storage_not_configured');
  return { publicUrl, objectPath };
}

/** Upload story media using a user-bound (RLS-scoped) client. */
export async function uploadStoryMediaAsUser(
  client: SupabaseClient,
  folderOwnerId: string,
  buffer: Buffer,
  mime: AllowedStoryImageMime | AllowedStoryVideoMime,
  kind: 'photo' | 'video',
): Promise<StoredStoryMedia> {
  const ext =
    kind === 'photo'
      ? IMAGE_EXT_BY_MIME[mime as AllowedStoryImageMime]
      : VIDEO_EXT_BY_MIME[mime as AllowedStoryVideoMime];
  const suffix = Math.random().toString(36).slice(2, 8);
  const objectPath = `${folderOwnerId}/story-${Date.now()}-${suffix}.${ext}`;

  const { error } = await client.storage.from(STORY_BUCKET).upload(objectPath, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`upload_failed: ${error.message}`);

  const publicUrl = storyPublicUrlFor(objectPath);
  if (!publicUrl) throw new Error('storage_not_configured');
  return { publicUrl, objectPath };
}

/**
 * Best-effort delete of a story media object. Never throws — a failed
 * cleanup must not fail the user's request (orphan cleanup can be retried
 * later via a sweep).
 */
export async function deleteStoryMedia(
  client: SupabaseClient,
  objectPath: string,
): Promise<void> {
  try {
    await client.storage.from(STORY_BUCKET).remove([objectPath]);
  } catch (error) {
    console.error('deleteStoryMedia failed (non-fatal):', error);
  }
}
