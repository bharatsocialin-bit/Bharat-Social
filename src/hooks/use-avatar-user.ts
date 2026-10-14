'use client';

import { useSocialStore } from '@/store/useSocialStore';
import { CURRENT_USER_ID, DEMO_USER_MAP } from '@/data/users';

/**
 * The user object to render for the CURRENT user's avatar across the app
 * shell (sidebar, composer, reply panel, mobile nav, home quick-poster).
 *
 * Prefers the signed-in user's real profile (name, @username, persistent
 * Supabase Storage photo) cached in the social store; falls back to the
 * demo user for anonymous previews. The store is populated by
 * `loadCurrentProfile()` (triggered from the sidebar once authenticated)
 * and refreshed after profile edits and avatar changes.
 */
export function useAvatarUser() {
  const real = useSocialStore((s) => s.currentProfileUser);
  const demo = DEMO_USER_MAP[CURRENT_USER_ID];

  if (!real) return demo;

  return {
    ...demo,
    name: real.name || demo.name,
    handle: real.username || demo.handle,
    avatarUrl: real.avatarUrl ?? null,
    initials: real.initials || demo.initials,
    avatarGradient: real.avatarGradient || demo.avatarGradient,
  };
}
