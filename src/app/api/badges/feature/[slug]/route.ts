import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ── POST /api/badges/feature/[slug] ────────────────────────────────────────
// Set the current user's featured badge by badge slug.
// Looks up the UserBadge by (userId, badge.slug), then sets
// user.featuredBadgeId to that UserBadge ID.
//
// Only one featured badge per user — setting a new one overwrites the old.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { slug } = await params;

    // Find the UserBadge row for this user + slug.
    const userBadge = await db.userBadge.findFirst({
      where: {
        userId: currentUser.id,
        badge: { slug },
      },
      include: { badge: { select: { active: true, slug: true } } },
    });
    if (!userBadge) {
      return NextResponse.json(
        { error: 'You have not earned this badge.' },
        { status: 404 },
      );
    }
    if (!userBadge.badge.active) {
      return NextResponse.json(
        { error: 'Inactive badges cannot be featured.' },
        { status: 400 },
      );
    }

    await db.user.update({
      where: { id: currentUser.id },
      data: { featuredBadgeId: userBadge.id },
    });

    return NextResponse.json({
      success: true,
      featuredBadgeSlug: slug,
    });
  } catch (e) {
    console.error('Error setting featured badge by slug:', e);
    return NextResponse.json({ error: 'Failed to set featured badge.' }, { status: 500 });
  }
}

// ── DELETE /api/badges/feature/[slug] ─────────────────────────────────────
// Clear the current user's featured badge (any).
export async function DELETE(_request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await db.user.update({
      where: { id: currentUser.id },
      data: { featuredBadgeId: null },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error clearing featured badge:', e);
    return NextResponse.json({ error: 'Failed to clear featured badge.' }, { status: 500 });
  }
}
