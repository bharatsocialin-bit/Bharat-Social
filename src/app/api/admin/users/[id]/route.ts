import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// PATCH /api/admin/users/[id] — suspend or reactivate a user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const { action } = await request.json(); // "suspend" | "reactivate"

    if (action !== 'suspend' && action !== 'reactivate') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "suspend" or "reactivate".' },
        { status: 400 },
      );
    }

    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Prevent suspending the last admin
    if (action === 'suspend' && targetUser.role === 'admin') {
      const adminCount = await db.user.count({ where: { role: 'admin', suspended: false } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot suspend the last administrator.' },
          { status: 400 },
        );
      }
    }

    // Prevent self-suspension
    if (action === 'suspend' && targetUser.id === admin!.id) {
      return NextResponse.json(
        { error: 'You cannot suspend your own account.' },
        { status: 400 },
      );
    }

    const newSuspended = action === 'suspend';

    // Check if already in the target state (idempotent)
    if (targetUser.suspended === newSuspended) {
      return NextResponse.json({
        success: true,
        message: `User is already ${action === 'suspend' ? 'suspended' : 'active'}.`,
      });
    }

    await db.user.update({
      where: { id },
      data: { suspended: newSuspended },
    });

    // If suspending, remove all their follow relationships
    if (newSuspended) {
      await db.follow.deleteMany({
        where: {
          OR: [
            { followerId: id },
            { followingId: id },
          ],
        },
      });
    }

    // Create audit record
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: newSuspended ? 'user_suspended' : 'user_reactivated',
        targetUserId: id,
        description: `User @${targetUser.username} ${newSuspended ? 'suspended' : 'reactivated'} by admin @${admin!.username}`,
      },
    });

    return NextResponse.json({
      success: true,
      userId: id,
      suspended: newSuspended,
    });
  } catch (error) {
    console.error('Admin user suspension error:', error);
    return NextResponse.json({ error: 'Failed to update user status.' }, { status: 500 });
  }
}
