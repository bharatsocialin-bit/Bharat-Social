import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { validateStoryForPublish } from '@/lib/comics/validate';

/**
 * POST /api/admin/comics/[id]/workflow
 * Body: { action: 'submit_review' | 'revert_to_draft' | 'publish' | 'unpublish' }
 *
 * Publishing workflow: Draft → Review → Preview → Publish.
 * `published` (the public-facing flag the reader filters on) is true ONLY
 * after a successful publish — which first validates title, testament and
 * Bible references, cover artwork, and every page asset's artwork.
 */
const ACTIONS = new Set(['submit_review', 'revert_to_draft', 'publish', 'unpublish']);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const action = body && typeof body === 'object' ? (body as Record<string, unknown>).action : null;
    if (typeof action !== 'string' || !ACTIONS.has(action)) {
      return NextResponse.json(
        { error: 'action must be one of submit_review, revert_to_draft, publish, unpublish.' },
        { status: 400 },
      );
    }

    const story = await db.comicStory.findUnique({
      where: { id },
      include: { pages: { select: { id: true } } },
    });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    if (action === 'submit_review') {
      if (story.status === 'published') {
        return NextResponse.json({ error: 'Story is already published.' }, { status: 409 });
      }
      const updated = await db.comicStory.update({
        where: { id },
        data: { status: 'review', published: false },
      });
      await db.moderationAction.create({
        data: {
          adminId: admin.id,
          action: 'comic_story_submitted_review',
          targetStoryId: id,
          description: `Comic Bible story "${story.title}" (${id}) submitted for review`,
        },
      });
      return NextResponse.json({ story: { id, status: updated.status, published: updated.published } });
    }

    if (action === 'revert_to_draft') {
      const updated = await db.comicStory.update({
        where: { id },
        data: { status: 'draft', published: false },
      });
      await db.moderationAction.create({
        data: {
          adminId: admin.id,
          action: 'comic_story_reverted_draft',
          targetStoryId: id,
          description: `Comic Bible story "${story.title}" (${id}) moved back to draft`,
        },
      });
      return NextResponse.json({ story: { id, status: updated.status, published: updated.published } });
    }

    if (action === 'unpublish') {
      const updated = await db.comicStory.update({
        where: { id },
        data: { status: 'draft', published: false },
      });
      await db.moderationAction.create({
        data: {
          adminId: admin.id,
          action: 'comic_story_unpublished',
          targetStoryId: id,
          description: `Comic Bible story "${story.title}" (${id}) unpublished — hidden from the public library`,
        },
      });
      return NextResponse.json({ story: { id, status: updated.status, published: updated.published } });
    }

    // ── publish ──
    const validation = await validateStoryForPublish(id);
    if (!validation.ok) {
      return NextResponse.json(
        { error: 'Story is not ready to publish.', issues: validation.issues, validation },
        { status: 422 },
      );
    }
    const updated = await db.comicStory.update({
      where: { id },
      data: {
        status: 'published',
        published: true,
        publishedAt: story.publishedAt ?? new Date(),
        publishedBy: admin.id,
      },
    });
    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_story_published',
        targetStoryId: id,
        description: `Published Comic Bible story "${story.title}" (${id}) with ${story.pages.length} page asset(s)`,
      },
    });
    return NextResponse.json({ story: { id, status: updated.status, published: updated.published } });
  } catch (err) {
    console.error('Admin comic workflow error:', err);
    return NextResponse.json({ error: 'Workflow action failed.' }, { status: 500 });
  }
}
