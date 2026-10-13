import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// GET /api/admin/stats — dashboard metrics
export async function GET() {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      totalLikes,
      totalBookmarks,
      totalFollows,
      totalBlocks,
      pendingReports,
      reviewedReports,
      dismissedReports,
      recentUsers,
      recentPosts,
    ] = await Promise.all([
      db.user.count(),
      db.post.count(),
      db.comment.count(),
      db.like.count(),
      db.bookmark.count(),
      db.follow.count(),
      db.block.count(),
      db.report.count({ where: { status: 'pending' } }),
      db.report.count({ where: { status: 'reviewed' } }),
      db.report.count({ where: { status: 'dismissed' } }),
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, username: true, name: true, createdAt: true, role: true },
      }),
      db.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          author: { select: { id: true, username: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      counts: {
        users: totalUsers,
        posts: totalPosts,
        comments: totalComments,
        likes: totalLikes,
        bookmarks: totalBookmarks,
        follows: totalFollows,
        blocks: totalBlocks,
        reportsPending: pendingReports,
        reportsReviewed: reviewedReports,
        reportsDismissed: dismissedReports,
      },
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name || u.username,
        createdAt: u.createdAt.toISOString(),
        role: u.role,
      })),
      recentPosts: recentPosts.map((p) => ({
        id: p.id,
        content: p.content.slice(0, 100),
        createdAt: p.createdAt.toISOString(),
        author: {
          id: p.author.id,
          username: p.author.username,
          name: p.author.name || p.author.username,
        },
      })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats.' }, { status: 500 });
  }
}
