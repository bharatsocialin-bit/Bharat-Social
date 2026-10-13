import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { deleteVideoFile } from '@/lib/shorts/storage';

// DELETE /api/admin/shorts/[id] — admin soft-deletes a short
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    // Require confirmation header
    const confirmHeader = request.headers.get('x-confirm-delete');
    if (confirmHeader !== 'true') {
      return NextResponse.json(
        { error: 'Confirmation required. Add x-confirm-delete: true header.' },
        { status: 400 },
      );
    }

    const short = await db.short.findUnique({ where: { id } });
    if (!short) {
      return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
    }

    // Idempotent
    if (short.deletedAt) {
      return NextResponse.json({ success: true, message: 'Short was already deleted.' });
    }

    await db.short.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit record
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'short_deleted',
        targetShortId: id,
        targetUserId: short.creatorId,
        description: `Short deleted by admin @${admin!.username}`,
      },
    });

    // Best-effort file cleanup
    deleteVideoFile(short.videoStorageKey).catch((e) => {
      console.error('Failed to delete short video file:', e);
    });

    return NextResponse.json({ success: true, deletedShortId: id });
  } catch (e) {
    console.error('Admin short delete error:', e);
    return NextResponse.json({ error: 'Failed to delete short.' }, { status: 500 });
  }
}

// PATCH /api/admin/shorts/[id] — restore a soft-deleted short, OR mark as removed
// Body: { action: "restore" | "remove" }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const { action } = await request.json();

    if (action !== 'restore' && action !== 'remove') {
      return NextResponse.json(
        { error: 'Action must be "restore" or "remove".' },
        { status: 400 },
      );
    }

    const short = await db.short.findUnique({ where: { id } });
    if (!short) {
      return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
    }

    if (action === 'restore') {
      if (!short.deletedAt && short.moderationStatus === 'active') {
        return NextResponse.json({ success: true, message: 'Short is already active.' });
      }
      await db.short.update({
        where: { id },
        data: { deletedAt: null, moderationStatus: 'active' },
      });
      await db.moderationAction.create({
        data: {
          adminId: admin!.id,
          action: 'short_restored',
          targetShortId: id,
          targetUserId: short.creatorId,
          description: `Short restored by admin @${admin!.username}`,
        },
      });
      return NextResponse.json({ success: true, restoredShortId: id });
    }

    // action === 'remove' — mark as removed (moderation status)
    await db.short.update({
      where: { id },
      data: { moderationStatus: 'removed' },
    });
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'short_deleted',
        targetShortId: id,
        targetUserId: short.creatorId,
        description: `Short marked as removed by admin @${admin!.username}`,
      },
    });
    return NextResponse.json({ success: true, removedShortId: id });
  } catch (e) {
    console.error('Admin short update error:', e);
    return NextResponse.json({ error: 'Failed to update short.' }, { status: 500 });
  }
}
