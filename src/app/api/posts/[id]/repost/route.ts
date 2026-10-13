import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { isEitherBlocked } from '@/lib/auth/blocks';

// POST /api/posts/[id]/repost — toggle repost
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

    // Verify post exists and is NOT soft-deleted.
    const post = await db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Block enforcement: do not allow reposting if either party has blocked the other.
    if (post.authorId !== currentUser.id) {
      const blocked = await isEitherBlocked(currentUser.id, post.authorId);
      if (blocked) {
        return NextResponse.json({ error: 'This action is not available.' }, { status: 403 });
      }
    }

    // Check if already reposted
    const existing = await db.repost.findUnique({
      where: { postId_userId: { postId, userId: currentUser.id } },
    });

    if (existing) {
      // Undo repost
      await db.repost.delete({ where: { id: existing.id } });
      return NextResponse.json({ reposted: false });
    } else {
      // Repost
      await db.repost.create({ data: { postId, userId: currentUser.id } });

      // Create notification (don't notify yourself)
      if (post.authorId !== currentUser.id) {
        await db.notification.create({
          data: {
            type: 'repost',
            userId: post.authorId,
            actorId: currentUser.id,
            postId,
          },
        });
      }

      return NextResponse.json({ reposted: true });
    }
  } catch (error) {
    console.error('Error toggling repost:', error);
    return NextResponse.json({ error: 'Failed to toggle repost.' }, { status: 500 });
  }
}
