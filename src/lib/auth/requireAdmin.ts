import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { NextResponse } from 'next/server';

/**
 * Get the current authenticated admin user.
 * Returns null if not authenticated OR not an admin.
 * Use this in every admin API route for server-side authorization.
 */
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return null;
  }
  return user;
}

/**
 * Check admin access and return a 403 response if unauthorized.
 * Usage:
 *   const [admin, error] = await requireAdmin();
 *   if (error) return error;
 */
export async function requireAdmin(): Promise<[null, NextResponse] | [Awaited<ReturnType<typeof getAdminUser>>, null]> {
  const admin = await getAdminUser();
  if (!admin) {
    return [null, NextResponse.json({ error: 'Forbidden: admin access required.' }, { status: 403 })];
  }
  return [admin, null];
}
