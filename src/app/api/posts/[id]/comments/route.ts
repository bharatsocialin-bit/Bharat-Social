import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { isEitherBlocked } from '@/lib/auth/blocks';
import { evaluateAndAwardBadges } from '@/lib/badges/evaluator';

// POST /api/posts/[id]/comments — create a comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const { content, language } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty.' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment is too long (max 500 characters).' }, { status: 400 });
    }

    // Verify the post exists and is not soft-deleted.
    const post = await db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Block enforcement: do not allow commenting if either party has blocked the other.
    if (post.authorId !== currentUser.id) {
      const blocked = await isEitherBlocked(currentUser.id, post.authorId);
      if (blocked) {
        return NextResponse.json({ error: 'This action is not available.' }, { status: 403 });
      }
    }

    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        language: language || 'en',
        postId,
        userId: currentUser.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarGradient: true,
            initials: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create notification (don't notify yourself)
    if (post.authorId !== currentUser.id) {
      await db.notification.create({
        data: {
          type: 'comment',
          userId: post.authorId,
          actorId: currentUser.id,
          postId,
        },
      });
    }

    // ── Evaluate badges for both the COMMENTER (comment-created trigger)
    // AND the POST AUTHOR (received-comments-count trigger). Both are
    // fire-and-forget so the response isn't blocked. We do them BEFORE the
    // return so they actually run.
    Promise.all([
      evaluateAndAwardBadges({ type: 'comment-created', commentId: comment.id }),
      evaluateAndAwardBadges({ type: 'generic', userId: post.authorId }),
    ]).catch((e) => {
      console.error('Badge evaluation failed after comment creation:', e);
    });

    return NextResponse.json({
      reply: {
        id: comment.id,
        authorId: comment.userId,
        content: comment.content,
        language: comment.language,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.user.id,
          name: comment.user.name || comment.user.username,
          handle: comment.user.username,
          initials: comment.user.initials,
          avatarGradient: comment.user.avatarGradient,
          avatarUrl: comment.user.avatarUrl,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment.' }, { status: 500 });
  }
}
