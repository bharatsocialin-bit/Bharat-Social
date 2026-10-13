import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/profile?username=xxx — get a user's profile + posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      // Return current user's profile
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.json({ user: currentUser });
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

    // Compute postsCount explicitly to exclude soft-deleted posts.
    const postsCount = await db.post.count({
      where: { authorId: user.id, deletedAt: null },
    });

    // Check if current user follows this user
    const currentUser = await getCurrentUser();
    let isFollowing = false;
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
    }

    // Get the user's posts
    const posts = await db.post.findMany({
      where: { authorId: user.id, deletedAt: null },
      include: {
        likes: { select: { userId: true } },
        comments: true,
        bookmarks: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

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
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 });
  }
}

// PATCH /api/profile — update current user's profile
export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, state, city, avatarGradient, initials } = body;

    // Validate types: all fields must be strings (or null/undefined to clear).
    // We explicitly reject arrays/objects/numbers — without these checks, a
    // client could send `bio: {evil: 1}` and the `.length > 500` check would
    // pass (undefined > 500 === false), storing a non-string in the DB.
    const stringFields = ['name', 'bio', 'state', 'city', 'avatarGradient', 'initials'] as const;
    for (const field of stringFields) {
      const v = body[field];
      if (v !== undefined && v !== null && typeof v !== 'string') {
        return NextResponse.json(
          { error: `Field "${field}" must be a string.` },
          { status: 400 },
        );
      }
    }

    // Validate field lengths
    if (name !== undefined && name !== null && name.length > 100) {
      return NextResponse.json({ error: 'Name is too long (max 100 characters).' }, { status: 400 });
    }
    if (bio !== undefined && bio !== null && bio.length > 500) {
      return NextResponse.json({ error: 'Bio is too long (max 500 characters).' }, { status: 400 });
    }
    if (state !== undefined && state !== null && state.length > 100) {
      return NextResponse.json({ error: 'State is too long.' }, { status: 400 });
    }
    if (city !== undefined && city !== null && city.length > 100) {
      return NextResponse.json({ error: 'City is too long.' }, { status: 400 });
    }
    if (initials !== undefined && initials !== null && initials.length > 4) {
      return NextResponse.json({ error: 'Initials are too long (max 4 characters).' }, { status: 400 });
    }
    // Validate initials format: only letters (defensive — they're rendered into avatars).
    if (initials !== undefined && initials !== null && initials.length > 0) {
      if (!/^[a-zA-Z]+$/.test(initials)) {
        return NextResponse.json({ error: 'Initials must contain only letters.' }, { status: 400 });
      }
    }
    // Validate avatarGradient against a whitelist. This is interpolated into a
    // className attribute in PostCard/UserAvatar, so we restrict to known-good
    // Tailwind gradient pairs to prevent presentation-breaking or impersonation
    // (e.g. someone setting their gradient to "bg-red-500" to fake a verified badge).
    const ALLOWED_GRADIENTS = [
      'from-sky-500 to-indigo-500',
      'from-amber-500 to-orange-600',
      'from-emerald-500 to-teal-600',
      'from-rose-500 to-pink-600',
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-yellow-500 to-amber-600',
      'from-green-500 to-emerald-600',
      'from-red-500 to-rose-600',
      'from-fuchsia-500 to-purple-600',
    ];
    if (avatarGradient !== undefined && avatarGradient !== null) {
      if (!ALLOWED_GRADIENTS.includes(avatarGradient)) {
        return NextResponse.json(
          { error: 'Invalid avatar gradient. Choose from the supported palette.' },
          { status: 400 },
        );
      }
    }

    // Treat empty strings as null for nullable string fields (so users can clear them).
    const update = {
      ...(name !== undefined && { name: (name === null || name.trim() === '') ? null : name }),
      ...(bio !== undefined && { bio: (bio === null || bio.trim() === '') ? null : bio }),
      ...(state !== undefined && { state: (state === null || state.trim() === '') ? null : state }),
      ...(city !== undefined && { city: (city === null || city.trim() === '') ? null : city }),
      ...(avatarGradient !== undefined && { avatarGradient }),
      ...(initials !== undefined && { initials: initials === null ? 'Ne' : initials.toUpperCase() }),
    };

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: currentUser.id },
      data: update,
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarGradient: true,
        initials: true,
        state: true,
        city: true,
      },
    });

    // ── Evaluate badges for the user (profile-updated trigger) —
    // fire-and-forget. Checks for "profile-complete" badge.
    const { evaluateAndAwardBadges } = await import('@/lib/badges/evaluator');
    evaluateAndAwardBadges({ type: 'profile-updated', userId: currentUser.id }).catch((e) => {
      console.error('Badge evaluation failed after profile update:', e);
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
