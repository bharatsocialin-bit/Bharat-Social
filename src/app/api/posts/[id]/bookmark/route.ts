import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// POST /api/posts/[id]/bookmark — toggle bookmark
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

    const existing = await db.bookmark.findUnique({
      where: { postId_userId: { postId, userId: currentUser.id } },
    });

    if (existing) {
      await db.bookmark.delete({ where: { id: existing.id } });
      return NextResponse.json({ bookmarked: false });
    }

    // Verify the post exists and is not soft-deleted. Without this check, the
    // user could bookmark a non-existent post (causing a Prisma FK error → 500)
    // or a soft-deleted post (silently succeeding but the bookmark then points
    // at content that's no longer visible).
    const post = await db.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    await db.bookmark.create({ data: { postId, userId: currentUser.id } });
    return NextResponse.json({ bookmarked: true });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return NextResponse.json({ error: 'Failed to toggle bookmark.' }, { status: 500 });
  }
}
