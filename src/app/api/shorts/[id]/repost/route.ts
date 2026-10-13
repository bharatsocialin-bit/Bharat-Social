import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// POST /api/shorts/[id]/repost — toggle repost on a short
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

    const short = await db.short.findUnique({
      where: { id: shortId },
      select: { id: true, creatorId: true, deletedAt: true, moderationStatus: true },
    });
    if (!short || short.deletedAt || short.moderationStatus === 'removed') {
      return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
    }

    // Check if already reposted
    const existing = await db.shortRepost.findUnique({
      where: { shortId_userId: { shortId, userId: currentUser.id } },
    });

    if (existing) {
      // Undo repost
      await db.shortRepost.delete({ where: { id: existing.id } });
      return NextResponse.json({ reposted: false });
    }

    // Repost
    await db.shortRepost.create({ data: { shortId, userId: currentUser.id } });

    // Create notification (don't notify yourself)
    if (short.creatorId !== currentUser.id) {
      await db.notification.create({
        data: {
          type: 'repost',
          userId: short.creatorId,
          actorId: currentUser.id,
          postId: null,
        },
      });
    }

    return NextResponse.json({ reposted: true });
  } catch (error) {
    console.error('Error toggling short repost:', error);
    return NextResponse.json({ error: 'Failed to toggle repost.' }, { status: 500 });
  }
}
