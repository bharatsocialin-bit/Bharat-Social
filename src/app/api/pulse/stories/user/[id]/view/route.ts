import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ============================================================================
// POST /api/pulse/stories/user/[id]/view — mark a story as viewed by the
// signed-in user. Idempotent (one row per viewer per story).
//
// Anonymous viewers cannot mark stories — they get a 200 with viewed=false
// so the client doesn't error out.
// ============================================================================

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing story id.' }, { status: 400 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      // Not an error — anonymous viewers simply don't record views.
      return NextResponse.json({ viewed: false, reason: 'anonymous' });
    }

    // Verify the story exists and is still live.
    const story = await db.userStory.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        expiresAt: true,
        archivedAt: true,
        deletedAt: true,
      },
    });
    if (!story || story.deletedAt || story.archivedAt) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }
    if (story.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Story has expired.' }, { status: 410 });
    }

    // The viewer's own story doesn't count as a view.
    if (story.authorId === currentUser.id) {
      return NextResponse.json({ viewed: false, reason: 'own_story' });
    }

    // Upsert — the (storyId, viewerId) unique constraint makes this safe.
    try {
      await db.userStoryView.upsert({
        where: { storyId_viewerId: { storyId: id, viewerId: currentUser.id } },
        update: {}, // no fields to update — just touch the row.
        create: { storyId: id, viewerId: currentUser.id },
      });
    } catch {
      // Race condition: another concurrent request already inserted. Fine.
    }

    return NextResponse.json({ viewed: true });
  } catch (error) {
    console.error('User story view error:', error);
    return NextResponse.json({ error: 'Failed to record view.' }, { status: 500 });
  }
}
