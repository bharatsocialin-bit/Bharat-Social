import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import {
  COMIC_MAX_BYTES,
  checkArtworkReachable,
  deleteComicArtwork,
  isRepoStaticArtwork,
  readComicImageMeta,
  uploadComicArtwork,
} from '@/lib/comics/storage';

/**
 * POST /api/admin/comics/[id]/cover — multipart upload of the story cover.
 * Field: `file` (jpeg/png/webp/gif, ≤ 25 MB). The ORIGINAL file is stored —
 * no recompression, no resizing. The previous uploaded cover object is
 * removed (repo-shipped static artwork is never deleted).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const story = await db.comicStory.findUnique({ where: { id } });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data with a `file` field.' }, { status: 400 });
    }
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing `file` field.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'Cover file is empty.' }, { status: 400 });
    }
    if (file.size > COMIC_MAX_BYTES) {
      return NextResponse.json(
        { error: `Cover must be ${Math.floor(COMIC_MAX_BYTES / (1024 * 1024))} MB or smaller.` },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await readComicImageMeta(buffer);
    if (!meta) {
      return NextResponse.json(
        { error: 'Unsupported image format. Use JPEG, PNG, WebP or GIF.' },
        { status: 415 },
      );
    }

    const stored = await uploadComicArtwork(id, 'covers', buffer, meta.mime);

    // Replace the cover only after the new object is safely stored.
    const previous = story.coverImagePath;
    const updated = await db.comicStory.update({
      where: { id },
      data: { coverImagePath: stored.url },
    });
    if (previous && previous !== stored.url && !isRepoStaticArtwork(previous)) {
      await deleteComicArtwork(previous);
    }

    // If the cover is broken today, uploading a new one can fix it — report
    // the fresh state so the UI can update the readiness checklist.
    const reachable = await checkArtworkReachable(updated.coverImagePath ?? '');

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_cover_replaced',
        targetStoryId: id,
        description: `Uploaded cover for Comic Bible story "${story.title}" (${id}) — ${meta.width ?? '?'}x${meta.height ?? '?'}, ${(file.size / 1024).toFixed(0)} KB`,
      },
    });

    return NextResponse.json({
      cover: {
        url: stored.url,
        width: meta.width,
        height: meta.height,
        fileSize: file.size,
        originalName: file.name,
        storage: stored.storage,
        reachable,
      },
    });
  } catch (err) {
    console.error('Admin comic cover upload error:', err);
    return NextResponse.json({ error: 'Cover upload failed.' }, { status: 500 });
  }
}
