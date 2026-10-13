import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// POST /api/blocks — toggle block
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (targetUserId === currentUser.id) {
      return NextResponse.json({ error: 'You cannot block yourself.' }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const existing = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUser.id,
          blockedId: targetUserId,
        },
      },
    });

    if (existing) {
      // Unblock
      await db.block.delete({ where: { id: existing.id } });

      // Do NOT auto-refollow — user must manually re-follow if they want
      return NextResponse.json({ blocked: false });
    } else {
      // Block
      await db.block.create({
        data: {
          blockerId: currentUser.id,
          blockedId: targetUserId,
        },
      });

      // Remove any existing follow relationship in both directions
      await db.follow.deleteMany({
        where: {
          OR: [
            { followerId: currentUser.id, followingId: targetUserId },
            { followerId: targetUserId, followingId: currentUser.id },
          ],
        },
      });

      return NextResponse.json({ blocked: true });
    }
  } catch (error) {
    console.error('Error toggling block:', error);
    return NextResponse.json({ error: 'Failed to toggle block.' }, { status: 500 });
  }
}
