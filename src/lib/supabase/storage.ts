import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getToken } from 'next-auth/jwt';
import { supabaseConfig } from './server';

/**
 * Supabase Storage helpers for profile photos (feature: complete profile
 * system).
 *
 * DESIGN — how the server is allowed to touch the `avatars` bucket:
 *
 *   Path 1 (preferred): SUPABASE_SERVICE_ROLE_KEY is configured.
 *     A server-only admin client uploads/deletes objects. The per-user
 *     folder is derived from the VERIFIED session user, never from client
 *     input, so one user can never write into another user's folder.
 *     The key lives only in server env vars — it is never sent to the
 *     browser and never prefixed with NEXT_PUBLIC_.
 *
 *   Path 2: Supabase session in cookies (Google OAuth users — the PKCE
 *     bridge leaves sb-* cookies behind). The cookie-aware client acts AS
 *     the user; Storage RLS policies (see scripts/profile-migration.sql)
 *     restrict writes to <auth.uid>/… (bucket-relative).
 *
 *   Path 3: Supabase access token stashed in the NextAuth JWT (email
 *     users, saved at sign-in by the credentials provider). A user-bound
 *     client is created with that bearer token; if it has expired we
 *     silently refresh it with the stashed refresh token and retry once.
 *     Same RLS folder isolation as Path 2.
 *
 * If no path is available the avatar route returns a clear 503 with setup
 * instructions instead of failing silently.
 */

export const AVATAR_BUCKET = 'avatars';
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Image formats accepted for profile photos. */
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

const EXTENSION_BY_MIME: Record<AllowedImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// ── Clients ────────────────────────────────────────────────────────────────

let adminClient: SupabaseClient | null = null;
let adminClientMissingKey = false;

/**
 * Service-role client. Returns null when SUPABASE_SERVICE_ROLE_KEY is not
 * configured (the recommended-but-optional setup).
 */
export function getStorageAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;
  if (adminClientMissingKey) return null;

  const config = supabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey) {
    adminClientMissingKey = true;
    return null;
  }
  adminClient = createClient(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}

/** Client bound to a Supabase access token (Path 3). */
export function getUserTokenClientIfNeeded(accessToken: string): SupabaseClient | null {
  const config = supabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ── URL / path helpers ─────────────────────────────────────────────────────

/**
 * Public URL for a BUCKET-RELATIVE object path like "<uid>/avatar-123.jpg".
 * The bucket segment is added here — storage.from(AVATAR_BUCKET) calls take
 * bucket-relative keys, so the same string must never be reused verbatim
 * after /object/public/ (that would double-prefix and 404).
 */
export function publicUrlFor(objectPath: string): string | null {
  const config = supabaseConfig();
  if (!config) return null;
  if (objectPath.startsWith(`${AVATAR_BUCKET}/`)) {
    // Defensive: tolerate legacy pre-prefixed paths instead of 404-ing them.
    objectPath = objectPath.slice(AVATAR_BUCKET.length + 1);
  }
  return `${config.url}/storage/v1/object/public/${AVATAR_BUCKET}/${objectPath}`;
}

/**
 * Extract the storage object path from a stored public URL.
 * Returns null when the URL does not point into our public bucket —
 * callers must NOT delete anything in that case (defends against a
 * tampered avatarUrl deleting arbitrary objects).
 */
export function objectPathFromPublicUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  const marker = '/storage/v1/object/public/';
  const idx = avatarUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = avatarUrl.slice(idx + marker.length).split('?')[0];
  if (!raw.startsWith(`${AVATAR_BUCKET}/`)) return null;
  // Return the BUCKET-RELATIVE key (strip the bucket segment) — callers pass
  // it straight to .from(AVATAR_BUCKET).remove(), which expects no prefix.
  return raw.slice(AVATAR_BUCKET.length + 1);
}

// ── Bucket bootstrap (service-key path only) ───────────────────────────────

/** Create the avatars bucket if missing. Best-effort; errors are logged. */
export async function ensureAvatarsBucket(admin: SupabaseClient): Promise<void> {
  try {
    const { data: existing } = await admin.storage.getBucket(AVATAR_BUCKET);
    if (existing) return;
    await admin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: AVATAR_MAX_BYTES,
      allowedMimeTypes: [...ALLOWED_IMAGE_MIMES],
    });
  } catch (error) {
    // Non-fatal: policies set up via SQL also create the bucket; and the
    // upload attempt will surface a precise error if it truly is missing.
    console.error('ensureAvatarsBucket failed:', error);
  }
}

// ── File-type sniffing (never trust the client's declared MIME) ────────────

/**
 * Detect the real image type from magic bytes. Returns null for anything
 * that is not one of our allowed formats — this is the authoritative check;
 * the browser-supplied file.type is only a hint.
 */
export function detectImageMime(buffer: Buffer): AllowedImageMime | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: "GIF87a" / "GIF89a"
  const header = buffer.subarray(0, 6).toString('latin1');
  if (header === 'GIF87a' || header === 'GIF89a') {
    return 'image/gif';
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

// ── Upload / delete primitives ─────────────────────────────────────────────

export interface StoredAvatar {
  /** Full persistent public URL to store on the user row. */
  publicUrl: string;
  /** Bucket-relative object path, e.g. "<uid>/avatar-…jpg". */
  objectPath: string;
}

/**
 * Upload an avatar for a user. `folderOwnerId` MUST come from the verified
 * server session (Supabase user id when known, else the local user id).
 * The client's filename is ignored entirely.
 */
export async function uploadAvatarObject(
  admin: SupabaseClient | null,
  folderOwnerId: string,
  buffer: Buffer,
  mime: AllowedImageMime,
): Promise<StoredAvatar> {
  const config = supabaseConfig();
  if (!config) throw new Error('storage_not_configured');

  const ext = EXTENSION_BY_MIME[mime];
  const suffix = Math.random().toString(36).slice(2, 8);
  // Bucket-relative key: .from(AVATAR_BUCKET).upload() must NOT receive an
  // "avatars/…" prefixed path (that would nest a second avatars/ folder).
  const objectPath = `${folderOwnerId}/avatar-${Date.now()}-${suffix}.${ext}`;

  if (admin) {
    const { error } = await admin.storage.from(AVATAR_BUCKET).upload(objectPath, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(`upload_failed: ${error.message}`);
  } else {
    // Caller resolved a user-bound client (RLS-scoped). Handled by the
    // route — this branch only exists to keep the signature simple.
    throw new Error('upload_failed: no storage client');
  }

  const publicUrl = publicUrlFor(objectPath);
  if (!publicUrl) throw new Error('storage_not_configured');
  return { publicUrl, objectPath };
}

/** Upload using a user-bound (RLS-scoped) client — Path 2 and 3. */
export async function uploadAvatarObjectAsUser(
  client: SupabaseClient,
  folderOwnerId: string,
  buffer: Buffer,
  mime: AllowedImageMime,
): Promise<StoredAvatar> {
  const ext = EXTENSION_BY_MIME[mime];
  const suffix = Math.random().toString(36).slice(2, 8);
  // Bucket-relative key (see uploadAvatarObject).
  const objectPath = `${folderOwnerId}/avatar-${Date.now()}-${suffix}.${ext}`;

  const { error } = await client.storage.from(AVATAR_BUCKET).upload(objectPath, buffer, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw new Error(`upload_failed: ${error.message}`);

  const publicUrl = publicUrlFor(objectPath);
  if (!publicUrl) throw new Error('storage_not_configured');
  return { publicUrl, objectPath };
}

/**
 * Best-effort delete of an avatar object. Never throws — a failed cleanup
 * must not fail the user's request (orphan cleanup can be retried later).
 */
export async function deleteAvatarObject(
  client: SupabaseClient,
  objectPath: string,
): Promise<void> {
  try {
    await client.storage.from(AVATAR_BUCKET).remove([objectPath]);
  } catch (error) {
    console.error('deleteAvatarObject failed (non-fatal):', error);
  }
}

// ── Stashed-token helpers (Path 3) ─────────────────────────────────────────

export interface StashedSupabaseTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Read the Supabase tokens stashed in the NextAuth JWT at email sign-in.
 * Returns null when the session has none (OAuth users use Path 2 instead;
 * legacy users have none at all).
 */
export async function getStashedSupabaseTokens(
  getReqCookies: () => Promise<string>,
): Promise<StashedSupabaseTokens | null> {
  try {
    const cookieHeader = await getReqCookies();
    // next-auth v4 getToken() accepts a minimal req shape with headers.cookie.
    const token = await getToken({
      req: { headers: { cookie: cookieHeader } } as never,
      secret: process.env.NEXTAUTH_SECRET || process.env.TEST_NEXTAUTH_SECRET,
    });
    const accessToken = (token as Record<string, unknown> | null)?.sbAccessToken;
    const refreshToken = (token as Record<string, unknown> | null)?.sbRefreshToken;
    if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
      return { accessToken, refreshToken };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Exchange a (possibly expired) refresh token for a fresh access token.
 * Stateless — creates a throwaway client, persists nothing.
 */
export async function refreshSupabaseAccessToken(
  refreshToken: string,
): Promise<string | null> {
  const config = supabaseConfig();
  if (!config) return null;
  try {
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    // Stateless refresh — refreshSession({ refresh_token }) works without an
    // existing session, unlike setSession which needs a decodable access token.
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session?.access_token) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
}
