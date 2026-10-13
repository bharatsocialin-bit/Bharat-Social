import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { isEitherBlocked } from '@/lib/auth/blocks';
import { evaluateAndAwardBadges } from '@/lib/badges/evaluator';

// POST /api/follow — toggle follow
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
      return NextResponse.json({ error: 'You cannot follow yourself.' }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, suspended: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Don't allow following suspended users — they're effectively gone.
    if (targetUser.suspended) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const existing = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      // Unfollow
      await db.follow.delete({ where: { id: existing.id } });
      return NextResponse.json({ following: false });
    }

    // Block enforcement: do not allow follow if either party has blocked the other.
    const blocked = await isEitherBlocked(currentUser.id, targetUserId);
    if (blocked) {
      return NextResponse.json({ error: 'This action is not available.' }, { status: 403 });
    }

    // Follow
    const follow = await db.follow.create({
      data: {
        followerId: currentUser.id,
        followingId: targetUserId,
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        type: 'follow',
        userId: targetUserId,
        actorId: currentUser.id,
      },
    });

    // ── Evaluate badges for the follower (follow-created trigger) —
    // fire-and-forget. Self-follows are blocked at the API level (above),
    // so they can't artificially boost the following count.
    evaluateAndAwardBadges({ type: 'follow-created', followId: follow.id }).catch((e) => {
      console.error('Badge evaluation failed after follow:', e);
    });

    return NextResponse.json({ following: true });
  } catch (error) {
    console.error('Error toggling follow:', error);
    return NextResponse.json({ error: 'Failed to toggle follow.' }, { status: 500 });
  }
}
