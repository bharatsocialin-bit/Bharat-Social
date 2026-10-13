import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// GET /api/admin/users — search and list users
export async function GET(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10), 1), 100);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const skip = (page - 1) * limit;

    const where = q
      ? {
          OR: [
            { username: { contains: q } },
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          state: true,
          city: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name || u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        state: u.state,
        city: u.city,
        postsCount: u._count.posts,
        followersCount: u._count.followers,
        followingCount: u._count.following,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }
}
