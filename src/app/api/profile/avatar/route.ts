import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { getSupabaseRouteClient } from '@/lib/supabase/route-client';
import {
  AVATAR_MAX_BYTES,
  detectImageMime,
  getStorageAdminClient,
  ensureAvatarsBucket,
  uploadAvatarObject,
  uploadAvatarObjectAsUser,
  deleteAvatarObject,
  objectPathFromPublicUrl,
  getStashedSupabaseTokens,
  refreshSupabaseAccessToken,
  getUserTokenClientIfNeeded,
} from '@/lib/supabase/storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AllowedImageMime } from '@/lib/supabase/storage';

// ============================================================================
// POST   /api/profile/avatar — upload/replace the profile photo (multipart)
// DELETE /api/profile/avatar — remove the profile photo
//
// SECURITY MODEL
//   - The storage folder is derived from the VERIFIED server session, never
//     from client input → a user cannot write into another user's path.
//   - Type/size are validated server-side: 5 MB cap, images only, decided
//     by magic-byte sniffing (the browser's file.type is untrusted).
//   - The DB row updated is always the session user's own row.
//   - When a photo is replaced, the previous object is deleted (no orphans).
//
// STORAGE RESOLUTION ORDER (first available wins)
//   1. SUPABASE_SERVICE_ROLE_KEY  (server-only admin client)
//   2. Supabase cookie session    (Google OAuth users, via the PKCE bridge)
//   3. Supabase tokens stashed in the NextAuth JWT (email users; refreshes
//      automatically on expiry)
//   With none configured the route answers 503 with setup guidance.
// ============================================================================

const STORAGE_SETUP_HINT =
  'Photo storage is not configured yet. Ask the administrator to set ' +
  'SUPABASE_SERVICE_ROLE_KEY (server env) or create the "avatars" bucket + ' +
  'policies (scripts/profile-migration.sql) in the Supabase dashboard.';

/** Shape of the fields this route needs from the DB user row. */
interface AvatarUser {
  id: string;
  supabaseUserId: string | null;
  avatarUrl: string | null;
}

interface ResolvedStorage {
  client: SupabaseClient;
  /** Admin client bypasses RLS; user clients MUST be folder-scoped. */
  isAdmin: boolean;
  folderOwnerId: string;
}

/**
 * Resolve how this request may touch Supabase Storage, in the documented
 * order. Returns null (with a reason) when no path is configured.
 */
async function resolveStorage(user: AvatarUser): Promise<
  { storage: ResolvedStorage } | { error: string; status: number; setup?: boolean }
> {
  // ── Path 1: service-role admin client ──
  const admin = getStorageAdminClient();
  if (admin) {
    await ensureAvatarsBucket(admin);
    return {
      storage: {
        client: admin,
        isAdmin: true,
        folderOwnerId: user.supabaseUserId ?? user.id,
      },
    };
  }

  // ── Path 2: Supabase cookie session (Google OAuth users) ──
  const routeClient = await getSupabaseRouteClient();
  if (routeClient) {
    // getUser() (unlike getSession()) triggers a silent token refresh when
    // the sb-* cookie holds an expired access token.
    const { data: userData, error } = await routeClient.auth.getUser();
    if (!error && userData.user) {
      const sid = userData.user.id;
      // Identity guard: the cookie session must belong to THIS local user.
      if (user.supabaseUserId && user.supabaseUserId !== sid) {
        return { error: 'Session identity mismatch.', status: 403 };
      }
      return {
        storage: {
          client: routeClient,
          isAdmin: false,
          folderOwnerId: sid, // RLS requires exactly auth.uid()
        },
      };
    }
  }

  // ── Path 3: tokens stashed in the NextAuth JWT (email users) ──
  const stashed = await getStashedSupabaseTokens(async () => (await cookies()).toString());
  if (stashed && user.supabaseUserId) {
    // Folder must equal auth.uid() for the RLS policies to admit the write.
    return {
      storage: {
        client: getUserTokenClientIfNeeded(stashed.accessToken) as SupabaseClient,
        isAdmin: false,
        folderOwnerId: user.supabaseUserId,
      },
    };
  }

  return { error: STORAGE_SETUP_HINT, status: 503, setup: true };
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse the multipart upload ──
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Expected a multipart form upload.' }, { status: 400 });
    }
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file received. Attach an image under "file".' },
        { status: 400 },
      );
    }

    // ── Size limit (server-enforced) ──
    if (file.size > AVATAR_MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large. Maximum size is 5 MB.' },
        { status: 413 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'The selected file is empty.' }, { status: 400 });
    }

    // ── Type check by magic bytes (never trust file.type) ──
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = detectImageMime(buffer);
    if (!mime) {
      return NextResponse.json(
        { error: 'Unsupported image format. Please upload a JPEG, PNG, WebP, or GIF.' },
        { status: 415 },
      );
    }

    // ── Resolve storage access ──
    const resolved = await resolveStorage({
      id: currentUser.id,
      supabaseUserId: currentUser.supabaseUserId,
      avatarUrl: currentUser.avatarUrl,
    });
    if ('error' in resolved) {
      return NextResponse.json(
        { error: resolved.error, setupRequired: resolved.setup ?? false },
        { status: resolved.status },
      );
    }
    const { client, isAdmin, folderOwnerId } = resolved.storage;

    // ── Upload (admin path; user path retries once after a token refresh) ──
    let stored: { publicUrl: string; objectPath: string } | null = null;
    try {
      stored = isAdmin
        ? await uploadAvatarObject(client, folderOwnerId, buffer, mime)
        : await uploadAvatarObjectAsUser(client, folderOwnerId, buffer, mime);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      // Expired stashed token → refresh once and retry (Path 3 only).
      if (!isAdmin) {
        const stashed = await getStashedSupabaseTokens(async () => (await cookies()).toString());
        if (stashed) {
          const fresh = await refreshSupabaseAccessToken(stashed.refreshToken);
          if (fresh) {
            const retryClient = getUserTokenClientIfNeeded(fresh);
            if (retryClient) {
              try {
                stored = await uploadAvatarObjectAsUser(retryClient, folderOwnerId, buffer, mime);
              } catch (retryErr) {
                console.error('Avatar upload retry failed:', retryErr);
              }
            }
          }
        }
      }
      if (!stored) {
        console.error('Avatar upload failed:', message);
        const bucketMissing = /bucket|not found/i.test(message);
        return NextResponse.json(
          {
            error: bucketMissing
              ? STORAGE_SETUP_HINT
              : 'Upload failed. Please try again in a moment.',
            setupRequired: bucketMissing,
          },
          { status: bucketMissing ? 503 : 502 },
        );
      }
    }

    // ── Persist the new URL on the user's OWN row ──
    const previousPath = objectPathFromPublicUrl(currentUser.avatarUrl);
    await db.user.update({
      where: { id: currentUser.id },
      data: { avatarUrl: stored.publicUrl },
      select: { id: true },
    });

    // ── Best-effort cleanup of the replaced object (no orphans) ──
    if (previousPath && previousPath !== stored.objectPath) {
      deleteAvatarObject(client, previousPath);
    }

    // ── Evaluate badges (profile-updated trigger) — fire-and-forget ──
    const { evaluateAndAwardBadges } = await import('@/lib/badges/evaluator');
    evaluateAndAwardBadges({ type: 'profile-updated', userId: currentUser.id }).catch((e) => {
      console.error('Badge evaluation failed after avatar update:', e);
    });

    return NextResponse.json({ avatarUrl: stored.publicUrl }, { status: 201 });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Failed to upload photo.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!currentUser.avatarUrl) {
      return NextResponse.json({ error: 'No profile photo to remove.' }, { status: 404 });
    }

    const objectPath = objectPathFromPublicUrl(currentUser.avatarUrl);

    // Null the field first (user-visible state), then clean the object.
    await db.user.update({
      where: { id: currentUser.id },
      data: { avatarUrl: null },
      select: { id: true },
    });

    if (objectPath) {
      const resolved = await resolveStorage({
        id: currentUser.id,
        supabaseUserId: currentUser.supabaseUserId,
        avatarUrl: currentUser.avatarUrl,
      });
      if ('storage' in resolved) {
        deleteAvatarObject(resolved.storage.client, objectPath);
      }
      // If storage is not configured we still removed the profile link —
      // the object (if any) becomes unreachable; admin cleanup is optional.
    }

    return NextResponse.json({ avatarUrl: null });
  } catch (error) {
    console.error('Error removing avatar:', error);
    return NextResponse.json({ error: 'Failed to remove photo.' }, { status: 500 });
  }
}
