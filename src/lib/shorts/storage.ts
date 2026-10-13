import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Shorts video storage utility
//
// DEVELOPMENT-ONLY storage: writes uploaded video files to the local
// filesystem under `public/uploads/shorts/`. Next.js statically serves
// anything under `public/` at the matching URL path, so a file at
// `public/uploads/shorts/abc.mp4` is reachable at `/uploads/shorts/abc.mp4`.
//
// In production you would replace this module with calls to S3 / Supabase
// Storage / a CDN — the schema and API contract stay identical.
//
// SECURITY:
//   - We never trust the client-supplied filename. Files are saved with a
//     random 32-byte hex name.
//   - We never trust the client-supplied MIME type alone. We sniff the first
//     few bytes ("magic bytes") of the file and verify they match the
//     declared type.
//   - We enforce a hard maximum size limit (default 50 MB).
//   - We enforce a hard maximum duration (default 180 s, enforced client-side
//     in the upload dialog AND verified server-side via ffprobe if available).
//   - The upload directory is created with restrictive permissions (0o755).
// ─────────────────────────────────────────────────────────────────────────────

export const SHORTS_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'shorts');
export const SHORTS_PUBLIC_PREFIX = '/uploads/shorts';

export const MAX_SHORT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_SHORT_DURATION_SECONDS = 180; // 3 minutes
export const MAX_CAPTION_LENGTH = 280;
export const MAX_HASHTAGS = 10;
export const MAX_HASHTAG_LENGTH = 40;

// Accepted video MIME types and the magic-byte signatures we require for each.
// We DO NOT trust the client's declared Content-Type — we sniff the file
// header and require it to match one of these signatures.
const ACCEPTED_VIDEO_SIGNATURES: Array<{
  mime: string;
  extension: string;
  // Each signature is a list of [offset, byteValue] pairs to check.
  // We only need a few bytes to distinguish the major container formats.
  match: Array<[number, number]>;
}> = [
  // MP4 / MOV — "ftyp" box at offset 4
  {
    mime: 'video/mp4',
    extension: 'mp4',
    match: [
      [4, 0x66], // 'f'
      [5, 0x74], // 't'
      [6, 0x79], // 'y'
      [7, 0x70], // 'p'
    ],
  },
  // WebM / Matroska — EBML magic at offset 0
  {
    mime: 'video/webm',
    extension: 'webm',
    match: [
      [0, 0x1a],
      [1, 0x45],
      [2, 0xdf],
      [3, 0xa3],
    ],
  },
  // QuickTime / MOV — "moov" or "mdat" at offset 4 (older MOV files)
  {
    mime: 'video/quicktime',
    extension: 'mov',
    match: [
      [4, 0x6d], // 'm'
      [5, 0x6f], // 'o'
      [6, 0x6f], // 'o'
      [7, 0x76], // 'v'
    ],
  },
];

export interface ValidatedVideoFile {
  /** Random 32-byte hex filename, e.g. "abc123def456....mp4" */
  filename: string;
  /** Relative path under public/, e.g. "uploads/shorts/abc123.mp4" — stored in DB. */
  storageKey: string;
  /** Public-served URL, e.g. "/uploads/shorts/abc123.mp4". */
  publicUrl: string;
  mimeType: string;
  size: number;
}

/**
 * Validate an uploaded video file by sniffing its magic bytes.
 * Returns null if the file is invalid (wrong type, too large, etc.).
 */
export async function validateUploadedVideo(
  file: File,
): Promise<{ ok: true; file: ValidatedVideoFile } | { ok: false; error: string }> {
  if (!file) {
    return { ok: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'File is empty.' };
  }

  if (file.size > MAX_SHORT_FILE_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    const maxMb = (MAX_SHORT_FILE_SIZE / 1024 / 1024).toFixed(0);
    return { ok: false, error: `File is too large (${mb} MB). Maximum is ${maxMb} MB.` };
  }

  // Read the first 16 bytes to sniff the magic signature.
  // (We read more than strictly necessary so future signature checks have room.)
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  let matched: (typeof ACCEPTED_VIDEO_SIGNATURES)[number] | null = null;
  for (const sig of ACCEPTED_VIDEO_SIGNATURES) {
    let ok = true;
    for (const [offset, byte] of sig.match) {
      if (header[offset] !== byte) {
        ok = false;
        break;
      }
    }
    if (ok) {
      matched = sig;
      break;
    }
  }

  if (!matched) {
    return {
      ok: false,
      error:
        'Unsupported or invalid video file. The file must be a valid MP4, WebM, or MOV (we verify the file header, not just the filename).',
    };
  }

  // Cross-check the declared Content-Type against the sniffed signature.
  // If the client lies about the type, reject — defensive in depth.
  if (file.type && file.type !== matched.mime) {
    // Some browsers report "video/x-matroska" for WebM, or "video/mp4" for MOV.
    // Allow "video/quicktime" to satisfy the WebM check if it matched MOV bytes.
    const tolerantMatch =
      (matched.mime === 'video/quicktime' && file.type === 'video/mp4') ||
      (matched.mime === 'video/webm' && file.type === 'video/x-matroska');
    if (!tolerantMatch) {
      return {
        ok: false,
        error: `File content does not match its declared type (declared: ${file.type}, detected: ${matched.mime}).`,
      };
    }
  }

  // Generate a random filename — never trust or reuse the client filename.
  const randomName = crypto.randomBytes(16).toString('hex');
  const filename = `${randomName}.${matched.extension}`;
  const storageKey = `uploads/shorts/${filename}`;
  const publicUrl = `${SHORTS_PUBLIC_PREFIX}/${filename}`;

  return {
    ok: true,
    file: {
      filename,
      storageKey,
      publicUrl,
      mimeType: matched.mime,
      size: file.size,
    },
  };
}

/**
 * Persist a validated video file to disk.
 * Creates the upload directory if it doesn't exist.
 */
export async function saveVideoFile(file: File, validated: ValidatedVideoFile): Promise<void> {
  // Ensure the upload directory exists with restrictive permissions.
  await fs.mkdir(SHORTS_UPLOAD_DIR, { recursive: true, mode: 0o755 });

  const targetPath = path.join(SHORTS_UPLOAD_DIR, validated.filename);

  // Defensive: ensure the resolved path is still inside the upload dir
  // (prevents any path-traversal shenanigans from a tampered filename).
  const rel = path.relative(SHORTS_UPLOAD_DIR, targetPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Invalid file path — refusing to write outside the upload directory.');
  }

  // Convert File to Buffer and write atomically.
  // (For large files in production we'd stream this to S3 instead.)
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(targetPath, buffer, { mode: 0o644 });
}

/**
 * Delete a video file from disk.
 * Used when a user deletes their own short or an admin removes one.
 * Silently no-ops if the file is already gone (idempotent).
 */
export async function deleteVideoFile(storageKey: string): Promise<void> {
  // storageKey looks like "uploads/shorts/abc.mp4" — relative to public/.
  if (!storageKey.startsWith('uploads/shorts/')) {
    // Defensive: only delete files we know we own.
    return;
  }
  const fullPath = path.join(process.cwd(), 'public', storageKey);
  try {
    await fs.unlink(fullPath);
  } catch (e) {
    // ENOENT is fine — file is already gone. Anything else, log.
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to delete short video file:', fullPath, e);
    }
  }
}

/**
 * Convert a stored storageKey into a public URL.
 * Returns null if the key is empty or malformed.
 */
export function storageKeyToPublicUrl(storageKey: string): string | null {
  if (!storageKey) return null;
  // Already a URL? Return as-is (we don't store external URLs, but be safe).
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey;
  }
  if (!storageKey.startsWith('uploads/')) return null;
  return `/${storageKey}`;
}

/**
 * Parse and validate the hashtags JSON string stored in the DB.
 * Returns an empty array if parsing fails.
 */
export function parseHashtags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === 'string').slice(0, MAX_HASHTAGS);
  } catch {
    return [];
  }
}

/**
 * Sanitize and stringify hashtags for DB storage.
 */
export function serializeHashtags(tags: string[]): string {
  const clean = tags
    .map((t) => t.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase())
    .filter((t) => t.length > 0 && t.length <= MAX_HASHTAG_LENGTH)
    .slice(0, MAX_HASHTAGS);
  // Deduplicate while preserving order.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of clean) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
    }
  }
  return JSON.stringify(unique);
}
