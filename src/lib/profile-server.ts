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

  type PostRow = {
    id: string;
    content: string;
    language: string;
    createdAt: Date;
    likes: Array<{ userId: string }>;
    comments: unknown[];
    bookmarks: Array<{ id: string }>;
  };

  // ── Parallel fan-out ──
  // The DB lives in ap-south-1 while Vercel functions default to us-east-1,
  // so EVERY query pays a cross-region round trip. These queries are
  // independent (they only need `user`), so run them concurrently instead
  // of sequentially — this is the profile page's main latency fix.
  const isOtherViewer = !!viewer.id && viewer.id !== user.id;
  const viewerId = viewer.id;

  const [postsCount, followRow, blockRow, reverseBlockRow, postRows] = await Promise.all([
    db.post.count({ where: { authorId: user.id, deletedAt: null } }),
    isOtherViewer
      ? db.follow.findUnique({
          where: {
            followerId_followingId: { followerId: viewerId as string, followingId: user.id },
          },
        })
      : Promise.resolve(null),
    isOtherViewer
      ? db.block.findUnique({
          where: {
            blockerId_blockedId: { blockerId: viewerId as string, blockedId: user.id },
          },
        })
      : Promise.resolve(null),
    isOtherViewer
      ? db.block.findUnique({
          where: {
            blockerId_blockedId: { blockerId: user.id, blockedId: viewerId as string },
          },
        })
      : Promise.resolve(null),
    // Fetched unconditionally in parallel; discarded below if the target
    // blocked the viewer (the extra query only happens in that rare case).
    db.post
      .findMany({
        where: { authorId: user.id, deletedAt: null },
        include: {
          likes: { select: { userId: true } },
          comments: true,
          bookmarks: viewerId
            ? { where: { userId: viewerId }, select: { id: true } }
            : { where: { id: '__never__' }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      .then((rows) => rows as unknown as PostRow[]),
  ]);

  const isFollowing = !!followRow;
  const isBlocked = !!blockRow;
  const blockedBy = !!reverseBlockRow;
  const posts: PostRow[] = blockedBy ? [] : postRows;

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
