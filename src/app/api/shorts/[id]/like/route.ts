import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// POST /api/shorts/[id]/like — toggle like on a short
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: shortId } = await params;

    // Verify the short exists and is viewable
    const short = await db.short.findUnique({
      where: { id: shortId },
      select: { id: true, creatorId: true, deletedAt: true, moderationStatus: true },
    });
    if (!short || short.deletedAt || short.moderationStatus === 'removed') {
      return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
    }

    // Check if already liked
    const existing = await db.shortLike.findUnique({
      where: { shortId_userId: { shortId, userId: currentUser.id } },
    });

    if (existing) {
      // Unlike
      await db.shortLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }

    // Like
    await db.shortLike.create({ data: { shortId, userId: currentUser.id } });

    // Create notification (don't notify yourself)
    if (short.creatorId !== currentUser.id) {
      await db.notification.create({
        data: {
          type: 'like',
          userId: short.creatorId,
          actorId: currentUser.id,
          postId: null, // Short likes don't currently carry a postId reference
        },
      });
    }

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error('Error toggling short like:', error);
    return NextResponse.json({ error: 'Failed to toggle like.' }, { status: 500 });
  }
}
