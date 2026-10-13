import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/pulse/regional?state=xxx&city=yyy — browse posts by region
// Uses author's state/city profile fields. Posts by users without location
// are excluded from regional results.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state')?.trim();
    const city = searchParams.get('city')?.trim();
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10), 1), 50);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const skip = (page - 1) * limit;

    // Validate input
    if (state && state.length > 100) {
      return NextResponse.json({ error: 'State filter is too long.' }, { status: 400 });
    }
    if (city && city.length > 100) {
      return NextResponse.json({ error: 'City filter is too long.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();

    // Get blocked user IDs
    let blockedUserIds: string[] = [];
    if (currentUser) {
      const blocks = await db.block.findMany({
        where: { blockerId: currentUser.id },
        select: { blockedId: true },
      });
      blockedUserIds = blocks.map((b) => b.blockedId);
    }

    // Build where clause for users with the specified location
    const userWhere: Record<string, unknown> = {
      suspended: false,
      ...(state ? { state: { contains: state } } : {}),
      ...(city ? { city: { contains: city } } : {}),
    };

    // Find users matching the location filter
    const matchingUsers = await db.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    const matchingUserIds = matchingUsers.map((u) => u.id);

    if (matchingUserIds.length === 0) {
      return NextResponse.json({
        posts: [],
        total: 0,
        page,
        totalPages: 0,
        message: 'No users found with the specified location. Posts without a location are not shown in regional results.',
      });
    }

    // Build post where clause
    const postWhere: Record<string, unknown> = {
      deletedAt: null,
      authorId: { in: matchingUserIds },
      ...(blockedUserIds.length > 0
        ? { authorId: { in: matchingUserIds.filter((id) => !blockedUserIds.includes(id)) } }
        : {}),
    };

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where: postWhere,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarGradient: true,
              initials: true,
              state: true,
              city: true,
            },
          },
          likes: { select: { userId: true } },
          comments: { select: { id: true } },
          _count: { select: { reposts: true } },
          bookmarks: currentUser
            ? { where: { userId: currentUser.id }, select: { id: true } }
            : false,
          reposts: currentUser
            ? { where: { userId: currentUser.id }, select: { id: true } }
            : false,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.post.count({ where: postWhere }),
    ]);

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        authorId: p.authorId,
        content: p.content,
        language: p.language,
        createdAt: p.createdAt.toISOString(),
        author: {
          id: p.author.id,
          name: p.author.name || p.author.username,
          handle: p.author.username,
          initials: p.author.initials,
          avatarGradient: p.author.avatarGradient,
          state: p.author.state,
          city: p.author.city,
        },
        likes: p.likes.length,
        liked: currentUser ? p.likes.some((l) => l.userId === currentUser.id) : false,
        reposts: p._count.reposts,
        reposted: currentUser ? (p.reposts as unknown as Array<{id: string}>).length > 0 : false,
        replies: [],
        bookmarked: currentUser ? p.bookmarks.length > 0 : false,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filter: { state: state || null, city: city || null },
      note: 'Posts are shown based on the author\'s profile state/city. Posts by users without a location are not shown in regional results.',
    });
  } catch (error) {
    console.error('Regional posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch regional posts.' }, { status: 500 });
  }
}
