import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// DELETE /api/posts/[id] — delete own post
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

    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Ownership check
    if (post.authorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts.' },
        { status: 403 },
      );
    }

    // Soft-delete the post (matches the admin-delete behavior).
    // We do NOT hard-delete because:
    //   - Likes/comments/reposts/reports cascade-delete with hard-delete,
    //     permanently destroying audit data the user might still need.
    //   - If the post is under active moderation review, a hard-delete would
    //     orphan the Report row (which has onDelete: Cascade).
    //   - Soft-delete preserves the option to restore.
    // If the post is already soft-deleted, this is a no-op (idempotent).
    if (post.deletedAt) {
      return NextResponse.json({ success: true, message: 'Post was already deleted.' });
    }

    await db.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post.' }, { status: 500 });
  }
}
