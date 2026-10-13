'use client';

import { useSession } from 'next-auth/react';

/**
 * Hook to get the current authenticated user.
 * Returns { user, status } where status is 'loading' | 'authenticated' | 'unauthenticated'.
 */
export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user
    ? {
        id: (session.user as { id?: string }).id,
        name: session.user.name,
        email: session.user.email,
      }
    : null;

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
}
