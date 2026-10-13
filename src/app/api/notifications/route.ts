import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/notifications — list current user's notifications (cursor pagination)
// Query params:
//   cursor=<id>  — fetch notifications older than this ID (for "load more")
//   limit=<n>    — page size (default 20, max 50)
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const requestedLimit = parseInt(searchParams.get('limit') || '20', 10);
    // Cap at 50 to prevent abuse, minimum 1.
    const limit = Math.min(Math.max(requestedLimit || 20, 1), 50);

    const notifications = await db.notification.findMany({
      where: { userId: currentUser.id },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarGradient: true,
            initials: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // take one extra to determine if there's a next page
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const unreadCount = await db.notification.count({
      where: { userId: currentUser.id, read: false },
    });

    return NextResponse.json({
      notifications: items.map((n) => ({
        id: n.id,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
        actor: {
          id: n.actor.id,
          name: n.actor.name || n.actor.username,
          handle: n.actor.username,
          initials: n.actor.initials,
          avatarGradient: n.actor.avatarGradient,
        },
      })),
      unreadCount,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications.' }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.notification.updateMany({
      where: { userId: currentUser.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to mark as read.' }, { status: 500 });
  }
}
