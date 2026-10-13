import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { isEitherBlocked } from '@/lib/auth/blocks';
import { evaluateAndAwardBadges } from '@/lib/badges/evaluator';

// POST /api/posts/[id]/like — toggle like
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;

    // Check if already liked
    const existing = await db.like.findUnique({
      where: { postId_userId: { postId, userId: currentUser.id } },
    });

    if (existing) {
      // Unlike
      await db.like.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }

    // Verify the post exists, is not soft-deleted, and check block relationship.
    // We do this AFTER the existing-like check so unliking still works even if
    // the post was just deleted (no orphaned like rows).
    const post = await db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Block enforcement: do not allow likes if either party has blocked the other.
    if (post.authorId !== currentUser.id) {
      const blocked = await isEitherBlocked(currentUser.id, post.authorId);
      if (blocked) {
        return NextResponse.json({ error: 'This action is not available.' }, { status: 403 });
      }
    }

    // Like
    const like = await db.like.create({ data: { postId, userId: currentUser.id } });

    // Create notification (don't notify yourself)
    if (post.authorId !== currentUser.id) {
      await db.notification.create({
        data: {
          type: 'like',
          userId: post.authorId,
          actorId: currentUser.id,
          postId,
        },
      });
    }

    // ── Evaluate badges for the liker (like-created trigger) —
    // fire-and-forget. Likes contribute to "distinct activity days".
    evaluateAndAwardBadges({ type: 'like-created', likeId: like.id }).catch((e) => {
      console.error('Badge evaluation failed after like:', e);
    });

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Failed to toggle like.' }, { status: 500 });
  }
}
