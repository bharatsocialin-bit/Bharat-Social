import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { db } from '@/lib/db';

/**
 * Get the current authenticated user from the NextAuth session.
 * Returns null if not authenticated.
 * If the user is suspended, returns null (treats them as unauthenticated
 * for all protected API routes, but they still have a session token).
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const userId = (session.user as { id?: string }).id;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      avatarGradient: true,
      initials: true,
      state: true,
      city: true,
      role: true,
      suspended: true,
      createdAt: true,
    },
  });

  // Suspended users cannot perform any protected actions
  if (user?.suspended) return null;

  return user;
}
