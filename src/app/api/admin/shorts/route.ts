import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { storageKeyToPublicUrl, parseHashtags } from '@/lib/shorts/storage';

// GET /api/admin/shorts — list all shorts (including soft-deleted/removed) for moderation
export async function GET(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'active'; // active | deleted | removed | all
    const requestedLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(requestedLimit || 20, 1), 100);
    const cursor = searchParams.get('cursor');

    const where: Record<string, unknown> = {};
    if (filter === 'active') {
      where.deletedAt = null;
      where.moderationStatus = 'active';
    } else if (filter === 'deleted') {
      where.deletedAt = { not: null };
    } else if (filter === 'removed') {
      where.moderationStatus = 'removed';
    }

    const shorts = await db.short.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
            reports: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = shorts.length > limit;
    const items = hasMore ? shorts.slice(0, limit) : shorts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      shorts: items.map((s) => ({
        id: s.id,
        creatorId: s.creatorId,
        creator: {
          id: s.creator.id,
          name: s.creator.name || s.creator.username,
          username: s.creator.username,
        },
        caption: s.caption,
        hashtags: parseHashtags(s.hashtags),
        language: s.language,
        videoUrl: storageKeyToPublicUrl(s.videoStorageKey),
        duration: s.duration,
        audioTitle: s.audioTitle,
        moderationStatus: s.moderationStatus,
        deletedAt: s.deletedAt?.toISOString() || null,
        createdAt: s.createdAt.toISOString(),
        counts: {
          likes: s._count.likes,
          comments: s._count.comments,
          reposts: s._count.reposts,
          reports: s._count.reports,
        },
      })),
      nextCursor,
      admin: admin ? { id: admin.id, username: admin.username } : null,
    });
  } catch (e) {
    console.error('Admin shorts list error:', e);
    return NextResponse.json({ error: 'Failed to fetch shorts.' }, { status: 500 });
  }
}
