import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { NextResponse } from 'next/server';

/**
 * Lordsbook role system.
 *
 * Roles (stored on User.role, a plain String column so new roles can be added
 * without a migration):
 *   - "user"         default; no admin access
 *   - "admin"        administrator: full Admin Panel access
 *   - "SUPER_ADMIN"  primary super admin: everything an admin can do, plus
 *                    immunity from suspension/demotion by ordinary admins.
 *
 * The primary SUPER_ADMIN account is designated by the promotion script
 * scripts/promote-super-admin.ts, which verifies the real authenticated
 * Supabase user before assigning the role — the email string is never
 * trusted from the browser.
 */

/** Roles recognized as having full administrator access. */
export const ADMIN_ROLES = new Set(['admin', 'SUPER_ADMIN']);

/** The highest-privilege role. */
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN' as const;

/** True when the user holds the SUPER_ADMIN role. */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === SUPER_ADMIN_ROLE;
}

/** True when the user holds any administrator role (admin or SUPER_ADMIN). */
export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && ADMIN_ROLES.has(role);
}

/**
 * Get the current authenticated admin user.
 * Returns null if not authenticated OR not an admin (admin or SUPER_ADMIN).
 * Use this in every admin API route for server-side authorization.
 */
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) {
    return null;
  }
  return user;
}

/** The non-null admin user type, guaranteed after a successful requireAdmin(). */
export type AdminUser = NonNullable<Awaited<ReturnType<typeof getAdminUser>>>;

/**
 * Check admin access and return a 403 response if unauthorized.
 * Usage:
 *   const [admin, error] = await requireAdmin();
 *   if (error) return error;
 *
 * Accepts both "admin" and "SUPER_ADMIN" — SUPER_ADMIN inherits all admin
 * powers. On the success branch `admin` is typed as AdminUser (non-null).
 */
export async function requireAdmin(): Promise<[null, NextResponse] | [AdminUser, null]> {
  const admin = await getAdminUser();
  if (!admin) {
    return [null, NextResponse.json({ error: 'Forbidden: admin access required.' }, { status: 403 })];
  }
  return [admin, null];
}

/**
 * Require the SUPER_ADMIN role specifically. Use for the most sensitive
 * operations (e.g. promoting/demoting other admins, platform settings that
 * only the primary owner should touch). Ordinary admins get a 403.
 */
export async function requireSuperAdmin(): Promise<[null, NextResponse] | [AdminUser, null]> {
  const admin = await getAdminUser();
  if (!admin || !isSuperAdmin(admin.role)) {
    return [null, NextResponse.json({ error: 'Forbidden: super admin access required.' }, { status: 403 })];
  }
  return [admin, null];
}
