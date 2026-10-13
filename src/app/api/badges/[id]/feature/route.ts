import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ── POST /api/badges/[id]/feature ──────────────────────────────────────────
// Set the current user's featured badge (displayed on their profile).
// `id` here is the UserBadge ID (the awarded instance), NOT the Badge slug.
//
// Rules:
//   - User must be authenticated.
//   - The UserBadge must belong to the current user.
//   - Setting a new featured badge clears any previous one (only one
//     featured badge per user).
//   - Cannot be a chat/community badge (those are inactive).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const userBadge = await db.userBadge.findUnique({
      where: { id },
      include: { badge: { select: { active: true, slug: true } } },
    });
    if (!userBadge) {
      return NextResponse.json({ error: 'Badge award not found.' }, { status: 404 });
    }
    if (userBadge.userId !== currentUser.id) {
      return NextResponse.json({ error: 'You can only feature your own badges.' }, { status: 403 });
    }
    if (!userBadge.badge.active) {
      return NextResponse.json({ error: 'Inactive badges cannot be featured.' }, { status: 400 });
    }

    // Update the user's featuredBadgeId. This is a single field on User,
    // so only one featured badge can exist at a time.
    await db.user.update({
      where: { id: currentUser.id },
      data: { featuredBadgeId: id },
    });

    return NextResponse.json({
      success: true,
      featuredBadgeSlug: userBadge.badge.slug,
    });
  } catch (e) {
    console.error('Error setting featured badge:', e);
    return NextResponse.json({ error: 'Failed to set featured badge.' }, { status: 500 });
  }
}

// ── DELETE /api/badges/[id]/feature ────────────────────────────────────────
// Clear the current user's featured badge.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Only clear if the requested ID matches the user's current featured badge.
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { featuredBadgeId: true },
    });
    if (user?.featuredBadgeId === id) {
      await db.user.update({
        where: { id: currentUser.id },
        data: { featuredBadgeId: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error clearing featured badge:', e);
    return NextResponse.json({ error: 'Failed to clear featured badge.' }, { status: 500 });
  }
}
