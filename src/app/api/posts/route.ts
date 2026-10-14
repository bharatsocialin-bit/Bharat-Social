import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { evaluateAndAwardBadges } from '@/lib/badges/evaluator';

// GET /api/posts — list posts with author, likes, comments, bookmarks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10);
    // Clamp limit to prevent abuse
    const limit = Math.min(Math.max(requestedLimit || 10, 1), 50);
    const following = searchParams.get('following') === 'true';

    const currentUser = await getCurrentUser();

    // Get IDs of users the current user has blocked (to filter their posts out)
    let blockedUserIds: string[] = [];
    if (currentUser) {
      const blocks = await db.block.findMany({
        where: { blockerId: currentUser.id },
        select: { blockedId: true },
      });
      blockedUserIds = blocks.map((b) => b.blockedId);
    }

    // Build where clause — exclude soft-deleted posts
    const where: Record<string, unknown> = { deletedAt: null };
    if (following && currentUser) {
      // Get IDs of users the current user follows
      const follows = await db.follow.findMany({
        where: { followerId: currentUser.id },
        select: { followingId: true },
      });
      const followingIds = follows.map((f) => f.followingId);
      followingIds.push(currentUser.id); // Include own posts
      where.authorId = { in: followingIds };
    }

    // Filter out blocked users' posts
    if (blockedUserIds.length > 0) {
      where.authorId = where.authorId
        ? { ...where.authorId as object, notIn: blockedUserIds }
        : { notIn: blockedUserIds };
    }

    const posts = await db.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarGradient: true,
            initials: true,
            avatarUrl: true,
          },
        },
        likes: {
          select: { userId: true },
        },
        _count: {
          select: { reposts: true },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarGradient: true,
                initials: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        bookmarks: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
        reposts: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Take one extra to check if there's more
      ...(cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {}),
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Transform for the frontend
    const transformed = items.map((p) => ({
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
        avatarUrl: p.author.avatarUrl,
      },
      likes: p.likes.length,
      liked: currentUser ? p.likes.some((l) => l.userId === currentUser.id) : false,
      reposts: p._count.reposts,
      reposted: currentUser ? (p.reposts as unknown as Array<{id: string}>).length > 0 : false,
      replies: p.comments.map((c) => ({
        id: c.id,
        authorId: c.userId,
        content: c.content,
        language: c.language,
        createdAt: c.createdAt.toISOString(),
        author: {
          id: c.user.id,
          name: c.user.name || c.user.username,
          handle: c.user.username,
          initials: c.user.initials,
          avatarGradient: c.user.avatarGradient,
          avatarUrl: c.user.avatarUrl,
        },
      })),
      bookmarked: currentUser ? p.bookmarks.length > 0 : false,
    }));

    return NextResponse.json({
      posts: transformed,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts.' },
      { status: 500 },
    );
  }
}

// POST /api/posts — create a new post
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'You must be logged in to post.' },
        { status: 401 },
      );
    }

    const { content, language } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Post content cannot be empty.' },
        { status: 400 },
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Post content is too long (max 500 characters).' },
        { status: 400 },
      );
    }

    const post = await db.post.create({
      data: {
        content: content.trim(),
        language: language || 'en',
        authorId: currentUser.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarGradient: true,
            initials: true,
            avatarUrl: true,
          },
        },
      },
    });

    // ── Evaluate badges for the post author (post-created trigger) ──
    // Fire-and-forget — doesn't block the response. We schedule it BEFORE
    // the return so it actually runs.
    evaluateAndAwardBadges({ type: 'post-created', postId: post.id }).catch((e) => {
      console.error('Badge evaluation failed after post creation:', e);
    });

    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        language: post.language,
        createdAt: post.createdAt.toISOString(),
        author: {
          id: post.author.id,
          name: post.author.name || post.author.username,
          handle: post.author.username,
          initials: post.author.initials,
          avatarGradient: post.author.avatarGradient,
        },
        likes: 0,
        liked: false,
        reposts: 0,
        replies: [],
        bookmarked: false,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post.' },
      { status: 500 },
    );
  }
}
