import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { storageKeyToPublicUrl, parseHashtags } from '@/lib/shorts/storage';

// ── GET /api/shorts ─────────────────────────────────────────────────────────
// Returns the vertical Shorts feed — one page of shorts at a time.
// Filter rules:
//   - Exclude soft-deleted shorts (deletedAt: null)
//   - Exclude moderated-out shorts (moderationStatus: 'removed')
//   - Exclude shorts by users the current viewer has blocked
//   - Exclude shorts by suspended users
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const requestedLimit = parseInt(searchParams.get('limit') || '5', 10);
    // Default to 5 shorts per page — keep it small to limit video bandwidth.
    // Hard max of 10 to prevent abuse.
    const limit = Math.min(Math.max(requestedLimit || 5, 1), 10);

    const currentUser = await getCurrentUser();

    // Get IDs of users the current user has blocked.
    let blockedUserIds: string[] = [];
    if (currentUser) {
      const blocks = await db.block.findMany({
        where: { blockerId: currentUser.id },
        select: { blockedId: true },
      });
      blockedUserIds = blocks.map((b) => b.blockedId);
    }

    const where: Record<string, unknown> = {
      deletedAt: null,
      moderationStatus: 'active',
      // Exclude shorts by suspended users — they're effectively gone from the platform.
      creator: { suspended: false },
    };
    if (blockedUserIds.length > 0) {
      where.creatorId = { notIn: blockedUserIds };
    }

    const shorts = await db.short.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarGradient: true,
            initials: true,
          },
        },
        likes: { select: { userId: true } },
        _count: {
          select: { comments: true, reposts: true },
        },
        // Filter reposts to just the current user — so we can tell whether
        // THIS viewer has reposted (without exposing every other user's repost).
        reposts: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = shorts.length > limit;
    const items = hasMore ? shorts.slice(0, limit) : shorts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const transformed = items.map((s) => {
      const videoUrl = storageKeyToPublicUrl(s.videoStorageKey);
      const repostsArr = (s.reposts as unknown as Array<{ id: string }>) || [];
      return {
        id: s.id,
        creatorId: s.creatorId,
        caption: s.caption,
        hashtags: parseHashtags(s.hashtags),
        language: s.language,
        videoUrl,
        thumbnailUrl: s.thumbnailUrl,
        duration: s.duration,
        audioTitle: s.audioTitle,
        createdAt: s.createdAt.toISOString(),
        creator: {
          id: s.creator.id,
          name: s.creator.name || s.creator.username,
          handle: s.creator.username,
          initials: s.creator.initials,
          avatarGradient: s.creator.avatarGradient,
        },
        likes: s.likes.length,
        liked: currentUser ? s.likes.some((l) => l.userId === currentUser.id) : false,
        comments: s._count.comments,
        reposts: s._count.reposts,
        reposted: currentUser ? repostsArr.length > 0 : false,
      };
    });

    return NextResponse.json({ shorts: transformed, nextCursor });
  } catch (error) {
    console.error('Error fetching shorts:', error);
    return NextResponse.json({ error: 'Failed to fetch shorts.' }, { status: 500 });
  }
}

// ── POST /api/shorts ────────────────────────────────────────────────────────
// Create a new short. Accepts multipart/form-data:
//   - video: the video file (validated server-side)
//   - caption: text caption (max 280 chars)
//   - hashtags: JSON array string e.g. '["mumbai","sunset"]'
//   - language: language code (default 'en')
//   - duration: video duration in seconds (optional, used for client-side metadata)
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'You must be logged in to upload a short.' }, { status: 401 });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video');
    const caption = (formData.get('caption') as string | null) || '';
    const hashtagsRaw = (formData.get('hashtags') as string | null) || '[]';
    const language = (formData.get('language') as string | null) || 'en';
    const durationStr = formData.get('duration') as string | null;
    const audioTitle = formData.get('audioTitle') as string | null;

    if (!videoFile || !(videoFile instanceof File)) {
      return NextResponse.json({ error: 'A video file is required.' }, { status: 400 });
    }

    // Validate caption length.
    const cleanCaption = caption.trim();
    if (cleanCaption.length === 0) {
      return NextResponse.json({ error: 'Caption cannot be empty.' }, { status: 400 });
    }
    if (cleanCaption.length > 280) {
      return NextResponse.json({ error: 'Caption is too long (max 280 characters).' }, { status: 400 });
    }

    // Parse + sanitize hashtags.
    let hashtags: string[] = [];
    try {
      const parsed = JSON.parse(hashtagsRaw);
      if (Array.isArray(parsed)) {
        hashtags = parsed
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase())
          .filter((t) => t.length > 0 && t.length <= 40)
          .slice(0, 10);
      }
    } catch {
      return NextResponse.json({ error: 'Hashtags must be a JSON array of strings.' }, { status: 400 });
    }

    // Validate duration (if provided).
    let duration: number | null = null;
    if (durationStr) {
      const d = parseFloat(durationStr);
      if (!Number.isNaN(d) && d > 0 && d <= 180) {
        duration = d;
      }
    }

    // ── Validate the uploaded video file (magic bytes, size, etc.) ──
    const { validateUploadedVideo, saveVideoFile, serializeHashtags } = await import('@/lib/shorts/storage');
    const validation = await validateUploadedVideo(videoFile);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // ── Persist the video file to disk ──
    await saveVideoFile(videoFile, validation.file);

    // ── Persist the metadata row in the DB ──
    const short = await db.short.create({
      data: {
        creatorId: currentUser.id,
        caption: cleanCaption,
        hashtags: serializeHashtags(hashtags),
        language,
        videoStorageKey: validation.file.storageKey,
        duration,
        audioTitle: audioTitle?.trim() || null,
        moderationStatus: 'active',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarGradient: true,
            initials: true,
          },
        },
      },
    });

    // ── Evaluate badges for the short creator (short-created trigger) ──
    // Fire-and-forget.
    const { evaluateAndAwardBadges } = await import('@/lib/badges/evaluator');
    evaluateAndAwardBadges({ type: 'short-created', shortId: short.id }).catch((e) => {
      console.error('Badge evaluation failed after short creation:', e);
    });

    return NextResponse.json(
      {
        short: {
          id: short.id,
          creatorId: short.creatorId,
          caption: short.caption,
          hashtags,
          language: short.language,
          videoUrl: validation.file.publicUrl,
          thumbnailUrl: short.thumbnailUrl,
          duration: short.duration,
          audioTitle: short.audioTitle,
          createdAt: short.createdAt.toISOString(),
          creator: {
            id: short.creator.id,
            name: short.creator.name || short.creator.username,
            handle: short.creator.username,
            initials: short.creator.initials,
            avatarGradient: short.creator.avatarGradient,
          },
          likes: 0,
          liked: false,
          comments: 0,
          reposts: 0,
          reposted: false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating short:', error);
    return NextResponse.json({ error: 'Failed to upload short.' }, { status: 500 });
  }
}
