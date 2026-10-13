import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// GET /api/admin/reports — list all reports with filters
export async function GET(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // "pending" | "reviewed" | "dismissed" | null (all)
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10), 1), 100);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [reports, total] = await Promise.all([
      db.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reporter: {
            select: { id: true, username: true, name: true },
          },
          post: {
            select: { id: true, content: true, authorId: true },
          },
        },
      }),
      db.report.count({ where }),
    ]);

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: {
          id: r.reporter.id,
          username: r.reporter.username,
          name: r.reporter.name || r.reporter.username,
        },
        reportedUserId: r.reportedUserId,
        post: r.post
          ? {
              id: r.post.id,
              content: r.post.content.slice(0, 200),
              authorId: r.post.authorId,
            }
          : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin reports list error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports.' }, { status: 500 });
  }
}
