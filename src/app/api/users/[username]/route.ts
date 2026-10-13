import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/users/[username] — get a user's profile + posts + follow/block status
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    if (!username || username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: 'Invalid username.' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarGradient: true,
        initials: true,
        state: true,
        city: true,
        createdAt: true,
        suspended: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If the user is suspended, expose only a minimal "suspended" payload.
    // Do NOT leak bio, location, follower counts, or posts to visitors.
    if (user.suspended) {
      return NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          avatarGradient: user.avatarGradient,
          initials: user.initials,
          createdAt: user.createdAt.toISOString(),
          suspended: true,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          isFollowing: false,
          isBlocked: false,
          blockedBy: false,
          isOwnProfile: false,
        },
        posts: [],
      });
    }

    // Compute postsCount explicitly to exclude soft-deleted posts.
    // (Using _count.posts would count deleted rows too — leaking moderation activity.)
    const postsCount = await db.post.count({
      where: { authorId: user.id, deletedAt: null },
    });

    const currentUser = await getCurrentUser();

    let isFollowing = false;
    let isBlocked = false;
    let blockedBy = false;

    if (currentUser && currentUser.id !== user.id) {
      const follow = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;

      const block = await db.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: currentUser.id,
            blockedId: user.id,
          },
        },
      });
      isBlocked = !!block;

      const reverseBlock = await db.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: user.id,
            blockedId: currentUser.id,
          },
        },
      });
      blockedBy = !!reverseBlock;
    }

    // Get the user's posts (don't show posts if blocked by this user)
    let posts: Array<{
      id: string; content: string; language: string;
      createdAt: Date; authorId: string;
      likes: Array<{ userId: string }>;
      bookmarks: Array<{ id: string }>;
    }> = [];
    if (!blockedBy) {
      posts = await db.post.findMany({
        where: { authorId: user.id, deletedAt: null },
        include: {
          likes: { select: { userId: true } },
          comments: true,
          bookmarks: currentUser
            ? { where: { userId: currentUser.id }, select: { id: true } }
            : { where: { id: '__never__' }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }) as Array<{
        id: string; content: string; language: string;
        createdAt: Date; authorId: string;
        likes: Array<{ userId: string }>;
        bookmarks: Array<{ id: string }>;
      }>;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        bio: user.bio || '',
        avatarGradient: user.avatarGradient,
        initials: user.initials,
        state: user.state,
        city: user.city,
        createdAt: user.createdAt.toISOString(),
        followersCount: user._count.followers,
        followingCount: user._count.following,
        postsCount,
        isFollowing,
        isBlocked,
        blockedBy,
        isOwnProfile: currentUser?.id === user.id,
      },
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        language: p.language,
        createdAt: p.createdAt.toISOString(),
        author: {
          id: user.id,
          name: user.name || user.username,
          handle: user.username,
          initials: user.initials,
          avatarGradient: user.avatarGradient,
        },
        likes: p.likes.length,
        liked: currentUser ? p.likes.some((l) => l.userId === currentUser.id) : false,
        reposts: 0,
        replies: [],
        bookmarked: currentUser ? p.bookmarks.length > 0 : false,
      })),
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 });
  }
}
