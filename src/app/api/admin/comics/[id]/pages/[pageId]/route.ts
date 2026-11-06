import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import {
  COMIC_MAX_BYTES,
  deleteComicArtwork,
  isRepoStaticArtwork,
  readComicImageMeta,
  uploadComicArtwork,
} from '@/lib/comics/storage';

/**
 * PATCH /api/admin/comics/[id]/pages/[pageId]
 *   Content-Type: application/json      → { pageNumber?, isSpread? }
 *   Content-Type: multipart/form-data   → file (replace artwork) + optional isSpread
 *
 * DELETE — remove the page after confirmation (x-confirm-delete header);
 * remaining pages are renumbered 1..N so the reading order stays sequential.
 */
async function resolveStoryPage(storyId: string, pageId: string) {
  const page = await db.comicPage.findUnique({ where: { id: pageId } });
  if (!page || page.storyId !== storyId) return null;
  return page;
}

/** Two-phase number assignment: park on negatives, then write finals. */
async function assignNumbers(ops: Array<{ id: string; pageNumber: number }>) {
  await db.$transaction(async (tx) => {
    for (let i = 0; i < ops.length; i++) {
      await tx.comicPage.update({ where: { id: ops[i].id }, data: { pageNumber: -(i + 1) } });
    }
    for (const op of ops) {
      await tx.comicPage.update({ where: { id: op.id }, data: { pageNumber: op.pageNumber } });
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id, pageId } = await params;
    const story = await db.comicStory.findUnique({ where: { id } });
    if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    const page = await resolveStoryPage(id, pageId);
    if (!page) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });

    const contentType = request.headers.get('content-type') ?? '';

    // ── Replace artwork (multipart) ──
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Missing `file` field.' }, { status: 400 });
      }
      if (file.size === 0) return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
      if (file.size > COMIC_MAX_BYTES) {
        return NextResponse.json(
          { error: `File is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is ${Math.floor(COMIC_MAX_BYTES / (1024 * 1024))} MB.` },
          { status: 413 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const meta = await readComicImageMeta(buffer);
      if (!meta) {
        return NextResponse.json({ error: 'Unsupported image format — use JPEG, PNG, WebP or GIF.' }, { status: 415 });
      }

      const stored = await uploadComicArtwork(id, 'pages', buffer, meta.mime);
      const previousPath = page.imagePath;
      const updated = await db.comicPage.update({
        where: { id: page.id },
        data: {
          imagePath: stored.url,
          width: meta.width,
          height: meta.height,
          fileSize: file.size,
          originalName: file.name.slice(0, 255),
          ...(form.get('isSpread') !== null
            ? { isSpread: String(form.get('isSpread')) === 'true' }
            : {}),
        },
      });
      if (previousPath !== stored.url && !isRepoStaticArtwork(previousPath)) {
        await deleteComicArtwork(previousPath);
      }
      await db.moderationAction.create({
        data: {
          adminId: admin.id,
          action: 'comic_page_replaced',
          targetStoryId: id,
          description: `Replaced artwork of page ${page.pageNumber} in Comic Bible story "${story.title}" (${id}) — ${(file.size / 1024).toFixed(0)} KB`,
        },
      });
      return NextResponse.json({ page: { id: updated.id, pageNumber: updated.pageNumber, imagePath: updated.imagePath, isSpread: updated.isSpread, width: updated.width, height: updated.height, fileSize: updated.fileSize } });
    }

    // ── JSON update (pageNumber / isSpread) ──
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const b = body as Record<string, unknown>;

    if (b.isSpread !== undefined) {
      const updated = await db.comicPage.update({
        where: { id: page.id },
        data: { isSpread: !!b.isSpread },
      });
      await db.moderationAction.create({
        data: {
          adminId: admin.id,
          action: 'comic_page_updated',
          targetStoryId: id,
          description: `Page ${page.pageNumber} of Comic Bible story "${story.title}" (${id}) layout set to ${updated.isSpread ? 'spread' : 'single'}`,
        },
      });
      return NextResponse.json({ page: { id: updated.id, pageNumber: updated.pageNumber, isSpread: updated.isSpread } });
    }

    if (b.pageNumber !== undefined) {
      const target = Number(b.pageNumber);
      if (!Number.isInteger(target) || target < 1 || target > 9999) {
        return NextResponse.json({ error: 'Page number must be an integer between 1 and 9999.' }, { status: 400 });
      }
      if (target !== page.pageNumber) {
        const occupant = await db.comicPage.findUnique({
          where: { storyId_pageNumber: { storyId: id, pageNumber: target } },
        });
        if (occupant) {
          // Swap the two pages' numbers atomically.
          await assignNumbers([
            { id: page.id, pageNumber: target },
            { id: occupant.id, pageNumber: page.pageNumber },
          ]);
        } else {
          await assignNumbers([{ id: page.id, pageNumber: target }]);
        }
        await db.moderationAction.create({
          data: {
            adminId: admin.id,
            action: 'comic_page_updated',
            targetStoryId: id,
            description: `Page number moved ${page.pageNumber} → ${target} in Comic Bible story "${story.title}" (${id})`,
          },
        });
      }
      const fresh = await db.comicPage.findUnique({ where: { id: page.id } });
      return NextResponse.json({ page: { id: page.id, pageNumber: fresh?.pageNumber, isSpread: fresh?.isSpread } });
    }

    return NextResponse.json({ error: 'Nothing to update — provide pageNumber or isSpread.' }, { status: 400 });
  } catch (err) {
    console.error('Admin comic page patch error:', err);
    return NextResponse.json({ error: 'Page update failed.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id, pageId } = await params;
    if (request.headers.get('x-confirm-delete') !== 'true') {
      return NextResponse.json({ error: 'Missing x-confirm-delete header.' }, { status: 400 });
    }
    const story = await db.comicStory.findUnique({ where: { id } });
    if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    const page = await resolveStoryPage(id, pageId);
    if (!page) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });

    await db.comicPage.delete({ where: { id: page.id } });

    // Keep reading order sequential (1..N) after removal.
    const remaining = await db.comicPage.findMany({
      where: { storyId: id },
      orderBy: { pageNumber: 'asc' },
      select: { id: true, pageNumber: true },
    });
    if (remaining.some((p, idx) => p.pageNumber !== idx + 1)) {
      await assignNumbers(remaining.map((p, idx) => ({ id: p.id, pageNumber: idx + 1 })));
    }

    if (!isRepoStaticArtwork(page.imagePath)) {
      await deleteComicArtwork(page.imagePath);
    }

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_page_deleted',
        targetStoryId: id,
        description: `Deleted page ${page.pageNumber} artwork from Comic Bible story "${story.title}" (${id})`,
      },
    });

    return NextResponse.json({ success: true, message: 'Page deleted.', remainingPages: remaining.length });
  } catch (err) {
    console.error('Admin comic page delete error:', err);
    return NextResponse.json({ error: 'Page deletion failed.' }, { status: 500 });
  }
}
