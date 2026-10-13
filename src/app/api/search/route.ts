import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/search?q=xxx — search users and posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ users: [], posts: [] });
    }

    if (q.length > 100) {
      return NextResponse.json(
        { error: 'Search query is too long (max 100 characters).' },
        { status: 400 },
      );
    }

    const currentUser = await getCurrentUser();

    // Get IDs of users the current user has blocked (to filter them out)
    let blockedUserIds: string[] = [];
    if (currentUser) {
      const blocks = await db.block.findMany({
        where: { blockerId: currentUser.id },
        select: { blockedId: true },
      });
      blockedUserIds = blocks.map((b) => b.blockedId);
    }

    // Search users (by username or name), excluding blocked users
    const users = await db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: q } },
              { name: { contains: q } },
            ],
          },
          ...(blockedUserIds.length > 0
            ? [{ id: { notIn: blockedUserIds } }]
            : []),
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarGradient: true,
        initials: true,
        bio: true,
      },
      take: 20,
    });

    // Search posts (by content), excluding posts from blocked users and soft-deleted posts
    const posts = await db.post.findMany({
      where: {
        content: { contains: q },
        deletedAt: null,
        ...(blockedUserIds.length > 0
          ? { authorId: { notIn: blockedUserIds } }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarGradient: true,
            initials: true,
          },
        },
        likes: { select: { userId: true } },
        comments: true,
        bookmarks: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name || u.username,
        avatarGradient: u.avatarGradient,
        initials: u.initials,
        bio: u.bio,
      })),
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        language: p.language,
        createdAt: p.createdAt.toISOString(),
        author: {
          id: p.author.id,
          name: p.author.name || p.author.username,
          handle: p.author.username,
          initials: p.author.initials,
          avatarGradient: p.author.avatarGradient,
        },
        likes: p.likes.length,
        liked: currentUser ? p.likes.some((l) => l.userId === currentUser.id) : false,
        reposts: 0,
        replies: [],
        bookmarked: currentUser ? p.bookmarks.length > 0 : false,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search.' },
      { status: 500 },
    );
  }
}
