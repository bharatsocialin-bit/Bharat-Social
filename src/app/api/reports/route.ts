import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// POST /api/reports — create a report
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportedUserId, postId, shortId, reason } = await request.json();

    // Must report something
    if (!reportedUserId && !postId && !shortId) {
      return NextResponse.json(
        { error: 'Must specify a user, post, or short to report.' },
        { status: 400 },
      );
    }

    if (!reason || !reason.trim() || reason.trim().length < 3) {
      return NextResponse.json(
        { error: 'A reason (at least 3 characters) is required.' },
        { status: 400 },
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'Reason is too long (max 500 characters).' },
        { status: 400 },
      );
    }

    // If reporting a user, verify they exist and aren't self
    if (reportedUserId) {
      if (reportedUserId === currentUser.id) {
        return NextResponse.json(
          { error: 'You cannot report yourself.' },
          { status: 400 },
        );
      }
      const targetUser = await db.user.findUnique({ where: { id: reportedUserId } });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }
    }

    // If reporting a post, verify it exists
    if (postId) {
      const post = await db.post.findUnique({ where: { id: postId } });
      if (!post) {
        return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
      }
    }

    // If reporting a short, verify it exists
    if (shortId) {
      const short = await db.short.findUnique({ where: { id: shortId } });
      if (!short) {
        return NextResponse.json({ error: 'Short not found.' }, { status: 404 });
      }
    }

    // Prevent duplicate reports from the same user for the same target
    const existing = await db.report.findFirst({
      where: {
        reporterId: currentUser.id,
        ...(reportedUserId ? { reportedUserId } : {}),
        ...(postId ? { postId } : {}),
        ...(shortId ? { shortId } : {}),
        status: 'pending',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reported this. It is pending review.' },
        { status: 409 },
      );
    }

    // Rate limit: max 10 reports per user
    const recentReports = await db.report.count({
      where: {
        reporterId: currentUser.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentReports >= 10) {
      return NextResponse.json(
        { error: 'You have submitted too many reports today. Please try again later.' },
        { status: 429 },
      );
    }

    await db.report.create({
      data: {
        reporterId: currentUser.id,
        reportedUserId: reportedUserId || null,
        postId: postId || null,
        shortId: shortId || null,
        reason: reason.trim(),
        status: 'pending',
      },
    });

    return NextResponse.json(
      { success: true, message: 'Report submitted. Thank you.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to create report.' }, { status: 500 });
  }
}
