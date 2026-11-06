import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

/**
 * POST /api/admin/comics/[id]/pages/reorder
 * Body: { order: [pageId, pageId, …] } — a complete permutation of the
 * story's page ids in the new reading order. Page numbers are rewritten
 * 1..N atomically (two-phase update avoids the (storyId, pageNumber)
 * unique constraint during the move). The reader always reads pages in
 * this saved order.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const story = await db.comicStory.findUnique({
      where: { id },
      include: { pages: { select: { id: true } } },
    });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const order = body && typeof body === 'object' ? (body as Record<string, unknown>).order : null;
    if (!Array.isArray(order) || order.some((v) => typeof v !== 'string')) {
      return NextResponse.json({ error: 'Body must be { order: string[] }.' }, { status: 400 });
    }

    const existingIds = new Set(story.pages.map((p) => p.id));
    const uniqueOrder = Array.from(new Set(order as string[]));
    if (uniqueOrder.length !== existingIds.size || uniqueOrder.some((pid) => !existingIds.has(pid))) {
      return NextResponse.json(
        { error: 'order must contain every page id of the story exactly once.' },
        { status: 400 },
      );
    }

    await db.$transaction(async (tx) => {
      // Phase 1 — park every page on unique negative numbers (no collisions).
      for (let i = 0; i < uniqueOrder.length; i++) {
        await tx.comicPage.update({
          where: { id: uniqueOrder[i] },
          data: { pageNumber: -(i + 1) },
        });
      }
      // Phase 2 — write the final sequential order 1..N.
      for (let i = 0; i < uniqueOrder.length; i++) {
        await tx.comicPage.update({
          where: { id: uniqueOrder[i] },
          data: { pageNumber: i + 1 },
        });
      }
    });

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_pages_reordered',
        targetStoryId: id,
        description: `Reordered ${uniqueOrder.length} page(s) of Comic Bible story "${story.title}" (${id})`,
      },
    });

    const pages = await db.comicPage.findMany({
      where: { storyId: id },
      orderBy: { pageNumber: 'asc' },
      select: { id: true, pageNumber: true },
    });
    return NextResponse.json({ success: true, pages });
  } catch (err) {
    console.error('Admin comic reorder error:', err);
    return NextResponse.json({ error: 'Reorder failed.' }, { status: 500 });
  }
}
