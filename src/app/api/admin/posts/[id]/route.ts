import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// DELETE /api/admin/posts/[id] — admin soft-deletes a post
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    // Check for confirmation header to prevent accidental deletion
    const confirmHeader = request.headers.get('x-confirm-delete');
    if (confirmHeader !== 'true') {
      return NextResponse.json(
        { error: 'Confirmation required. Add x-confirm-delete: true header.' },
        { status: 400 },
      );
    }

    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // Already deleted — idempotent
    if (post.deletedAt) {
      return NextResponse.json({ success: true, message: 'Post was already deleted.' });
    }

    // Soft-delete: set deletedAt timestamp
    await db.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create audit record
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'post_deleted',
        targetPostId: id,
        targetUserId: post.authorId,
        description: `Post deleted by admin @${admin!.username}`,
      },
    });

    return NextResponse.json({ success: true, deletedPostId: id });
  } catch (error) {
    console.error('Admin post deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete post.' }, { status: 500 });
  }
}

// PATCH /api/admin/posts/[id] — admin restores a soft-deleted post
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    if (!post.deletedAt) {
      return NextResponse.json({ success: true, message: 'Post is not deleted.' });
    }

    // Restore: clear deletedAt
    await db.post.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Create audit record
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'post_restored',
        targetPostId: id,
        targetUserId: post.authorId,
        description: `Post restored by admin @${admin!.username}`,
      },
    });

    return NextResponse.json({ success: true, restoredPostId: id });
  } catch (error) {
    console.error('Admin post restore error:', error);
    return NextResponse.json({ error: 'Failed to restore post.' }, { status: 500 });
  }
}
