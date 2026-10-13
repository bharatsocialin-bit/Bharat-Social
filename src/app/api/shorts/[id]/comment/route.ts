import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/shorts/[id]/comment — list comments for a short
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: shortId } = await params;

    const short = await db.short.findUnique({
      where: { id: shortId },
      select: { id: true, deletedAt: true, moderationStatus: true },
    });
    if (!short || short.deletedAt || short.moderationStatus === 'removed') {
      return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
    }

    const comments = await db.shortComment.findMany({
      where: { shortId },
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
      take: 100, // Hard cap to prevent abuse
    });

    return NextResponse.json({
      comments: comments.map((c) => ({
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
    });
  } catch (error) {
    console.error('Error fetching short comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments.' }, { status: 500 });
  }
}

// POST /api/shorts/[id]/comment — add a comment to a short
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: shortId } = await params;
    const { content, language } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty.' }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment is too long (max 500 characters).' }, { status: 400 });
    }

    const short = await db.short.findUnique({
      where: { id: shortId },
      select: { id: true, creatorId: true, deletedAt: true, moderationStatus: true },
    });
    if (!short || short.deletedAt || short.moderationStatus === 'removed') {
      return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
    }

    const comment = await db.shortComment.create({
      data: {
        content: content.trim(),
        language: language || 'en',
        shortId,
        userId: currentUser.id,
      },
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
    });

    // Create notification (don't notify yourself)
    if (short.creatorId !== currentUser.id) {
      await db.notification.create({
        data: {
          type: 'comment',
          userId: short.creatorId,
          actorId: currentUser.id,
          postId: null,
        },
      });
    }

    return NextResponse.json(
      {
        reply: {
          id: comment.id,
          authorId: comment.userId,
          content: comment.content,
          language: comment.language,
          createdAt: comment.createdAt.toISOString(),
          author: {
            id: comment.user.id,
            name: comment.user.name || comment.user.username,
            handle: comment.user.username,
            initials: comment.user.initials,
            avatarGradient: comment.user.avatarGradient,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating short comment:', error);
    return NextResponse.json({ error: 'Failed to create comment.' }, { status: 500 });
  }
}
