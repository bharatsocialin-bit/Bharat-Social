import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { storageKeyToPublicUrl, parseHashtags, deleteVideoFile } from '@/lib/shorts/storage';

// GET /api/shorts/[id] — fetch a single short with full metadata + comments
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    const short = await db.short.findUnique({
      where: { id },
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
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarGradient: true,
                initials: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        reposts: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
      },
    });

    if (!short || short.deletedAt || short.moderationStatus === 'removed') {
      return NextResponse.json({ error: 'Short not found or no longer available.' }, { status: 404 });
    }

    // Hide blocked users' content
    if (currentUser) {
      const blockExists = await db.block.findUnique({
        where: {
          blockerId_blockedId: { blockerId: currentUser.id, blockedId: short.creatorId },
        },
      });
      if (blockExists) {
        return NextResponse.json({ error: 'Short not available.' }, { status: 403 });
      }
    }

    const videoUrl = storageKeyToPublicUrl(short.videoStorageKey);

    return NextResponse.json({
      short: {
        id: short.id,
        creatorId: short.creatorId,
        caption: short.caption,
        hashtags: parseHashtags(short.hashtags),
        language: short.language,
        videoUrl,
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
        likes: short.likes.length,
        liked: currentUser ? short.likes.some((l) => l.userId === currentUser.id) : false,
        comments: short.comments.map((c) => ({
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
          },
        })),
        reposts: short.reposts.length,
        reposted: currentUser ? (short.reposts as unknown as Array<{ id: string }>).length > 0 : false,
      },
    });
  } catch (error) {
    console.error('Error fetching short:', error);
    return NextResponse.json({ error: 'Failed to fetch short.' }, { status: 500 });
  }
}

// DELETE /api/shorts/[id] — creator deletes their own short (soft-delete)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const short = await db.short.findUnique({ where: { id } });
    if (!short) {
      return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
    }

    // Ownership check
    if (short.creatorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only delete your own shorts.' },
        { status: 403 },
      );
    }

    // Idempotent soft-delete
    if (short.deletedAt) {
      return NextResponse.json({ success: true, message: 'Short was already deleted.' });
    }

    await db.short.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Best-effort: also remove the video file from disk to free space.
    // We do NOT await this in a transaction — if it fails, the DB row is
    // already updated and the file just becomes an orphan that the next
    // cleanup pass can remove.
    deleteVideoFile(short.videoStorageKey).catch((e) => {
      console.error('Failed to delete short video file:', e);
    });

    return NextResponse.json({ success: true, deletedShortId: id });
  } catch (error) {
    console.error('Error deleting short:', error);
    return NextResponse.json({ error: 'Failed to delete short.' }, { status: 500 });
  }
}
