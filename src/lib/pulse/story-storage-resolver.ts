import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseRouteClient } from '@/lib/supabase/route-client';
import {
  getStorageAdminClient,
  getStashedSupabaseTokens,
  refreshSupabaseAccessToken,
  getUserTokenClientIfNeeded,
} from '@/lib/supabase/storage';
import { ensureStoryBucket } from '@/lib/supabase/story-storage';

/**
 * Story-media storage resolution — mirrors the avatar route pattern
 * (Path 1: service-role admin / Path 2: Supabase cookie session /
 * Path 3: tokens stashed in NextAuth JWT).
 *
 * Returns the client + folder owner id + admin flag, or an error response
 * descriptor.
 */
export interface ResolvedStoryStorage {
  client: SupabaseClient;
  isAdmin: boolean;
  folderOwnerId: string;
}

export interface StoryStorageUser {
  id: string;
  supabaseUserId: string | null;
}

const STORY_STORAGE_SETUP_HINT =
  'Story media storage is not configured. Ask the administrator to set ' +
  'SUPABASE_SERVICE_ROLE_KEY (server env) or create the "user-stories" ' +
  'bucket + policies (scripts/user-stories-migration.sql) in the Supabase dashboard.';

export async function resolveStoryStorage(
  user: StoryStorageUser,
): Promise<
  | { storage: ResolvedStoryStorage }
  | { error: string; status: number; setup?: boolean }
> {
  // ── Path 1: service-role admin client ──
  const admin = getStorageAdminClient();
  if (admin) {
    await ensureStoryBucket(admin);
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
    const { data: userData, error } = await routeClient.auth.getUser();
    if (!error && userData.user) {
      const sid = userData.user.id;
      if (user.supabaseUserId && user.supabaseUserId !== sid) {
        return { error: 'Session identity mismatch.', status: 403 };
      }
      return {
        storage: {
          client: routeClient,
          isAdmin: false,
          folderOwnerId: sid,
        },
      };
    }
  }

  // ── Path 3: tokens stashed in NextAuth JWT (email users) ──
  const stashed = await getStashedSupabaseTokens(async () => (await cookies()).toString());
  if (stashed && user.supabaseUserId) {
    return {
      storage: {
        client: getUserTokenClientIfNeeded(stashed.accessToken) as SupabaseClient,
        isAdmin: false,
        folderOwnerId: user.supabaseUserId,
      },
    };
  }

  return { error: STORY_STORAGE_SETUP_HINT, status: 503, setup: true };
}

/**
 * When an upload via Path 3 fails (expired token), refresh the stashed
 * access token once and return a fresh user-bound client. Returns null
 * when refresh is not possible.
 */
export async function refreshStoryStorageClient(
  user: StoryStorageUser,
): Promise<ResolvedStoryStorage | null> {
  if (!user.supabaseUserId) return null;
  const stashed = await getStashedSupabaseTokens(async () => (await cookies()).toString());
  if (!stashed) return null;
  const fresh = await refreshSupabaseAccessToken(stashed.refreshToken);
  if (!fresh) return null;
  const client = getUserTokenClientIfNeeded(fresh);
  if (!client) return null;
  return { client, isAdmin: false, folderOwnerId: user.supabaseUserId };
}
