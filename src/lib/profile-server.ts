import { db } from '@/lib/db';
import { parseStoredLinks } from '@/lib/profile';

/**
 * Server-side helpers shared by the profile APIs (/api/profile and
 * /api/users/[username] — feature: complete profile system).
 *
 * `buildPublicProfile` returns the canonical public shape for ANY user's
 * profile page. It deliberately:
 *   - NEVER includes private fields (email, dateOfBirth, gender, role,
 *     supabaseUserId, suspended details beyond a boolean, passwordHash).
 *   - Includes avatarUrl (persistent Supabase Storage URL), parsed links,
 *     state/city, follower/following/post counts and viewer-specific
 *     follow/block state.
 */

export interface PublicProfileViewerContext {
  id: string | null;
}

export async function buildPublicProfile(
  userId: string,
  viewer: PublicProfileViewerContext,
): Promise<{ user: Record<string, unknown>; posts: Record<string, unknown>[] } | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarGradient: true,
      initials: true,
      avatarUrl: true,
      state: true,
      city: true,
      links: true,
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

  if (!user) return null;

  // Suspended users expose only a minimal payload — no bio, links, counts
  // or posts (same behaviour the previous per-route implementations had).
  if (user.suspended) {
    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        avatarGradient: user.avatarGradient,
        initials: user.initials,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        suspended: true,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        isFollowing: false,
        isBlocked: false,
        blockedBy: false,
        isOwnProfile: viewer.id === user.id,
      },
      posts: [],
    };
  }

  const postsCount = await db.post.count({
    where: { authorId: user.id, deletedAt: null },
  });

  let isFollowing = false;
  let isBlocked = false;
  let blockedBy = false;

  if (viewer.id && viewer.id !== user.id) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId: viewer.id, followingId: user.id },
      },
    });
    isFollowing = !!follow;

    const block = await db.block.findUnique({
      where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: user.id } },
    });
    isBlocked = !!block;

    const reverseBlock = await db.block.findUnique({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: viewer.id } },
    });
    blockedBy = !!reverseBlock;
  }

  type PostRow = {
    id: string;
    content: string;
    language: string;
    createdAt: Date;
    likes: Array<{ userId: string }>;
    comments: unknown[];
    bookmarks: Array<{ id: string }>;
  };

  let posts: PostRow[] = [];
  if (!blockedBy) {
    posts = (await db.post.findMany({
      where: { authorId: user.id, deletedAt: null },
      include: {
        likes: { select: { userId: true } },
        comments: true,
        bookmarks: viewer.id
          ? { where: { userId: viewer.id }, select: { id: true } }
          : { where: { id: '__never__' }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })) as PostRow[];
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.name || user.username,
      bio: user.bio || '',
      avatarGradient: user.avatarGradient,
      initials: user.initials,
      avatarUrl: user.avatarUrl,
      state: user.state,
      city: user.city,
      links: parseStoredLinks(user.links),
      createdAt: user.createdAt.toISOString(),
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount,
      isFollowing,
      isBlocked,
      blockedBy,
      isOwnProfile: viewer.id === user.id,
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
        avatarUrl: user.avatarUrl,
      },
      likes: p.likes.length,
      liked: viewer.id ? p.likes.some((l) => l.userId === viewer.id) : false,
      reposts: 0,
      replies: [],
      bookmarked: viewer.id ? p.bookmarks.length > 0 : false,
    })),
  };
}
