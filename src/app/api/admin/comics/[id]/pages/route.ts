import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import {
  COMIC_MAX_BYTES,
  readComicImageMeta,
  uploadComicArtwork,
} from '@/lib/comics/storage';

/**
 * POST /api/admin/comics/[id]/pages — batch upload comic artwork.
 *
 * Multipart fields:
 *   files      — one or more image files (jpeg/png/webp/gif, ≤ 25 MB each)
 *   layouts    — JSON array aligned with the files: "single" | "spread" per
 *                file ("spread" = one pre-composed two-page landscape image)
 *   startNumber — optional first page number (default: after the current
 *                last page, so batches append automatically)
 *
 * Page numbers are assigned sequentially in upload order (manual reordering
 * and editing happen in the page editor afterwards). Originals are stored
 * byte-for-byte — never recompressed.
 */
interface UploadResult {
  filename: string;
  ok: boolean;
  error?: string;
  page?: {
    id: string;
    pageNumber: number;
    imagePath: string;
    isSpread: boolean;
    width: number | null;
    height: number | null;
    fileSize: number;
    storage: string;
  };
}

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
      include: { pages: { select: { pageNumber: true, id: true } } },
    });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
    }

    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: 'No image files received.' }, { status: 400 });
    }
    if (files.length > 50) {
      return NextResponse.json({ error: 'Upload at most 50 files per batch.' }, { status: 400 });
    }

    let layouts: string[] = [];
    const layoutsRaw = form.get('layouts');
    if (typeof layoutsRaw === 'string' && layoutsRaw.trim()) {
      try {
        const parsed = JSON.parse(layoutsRaw);
        if (Array.isArray(parsed)) layouts = parsed.map((v) => String(v));
      } catch {
        // fall through — default to single pages
      }
    }

    const maxExisting = story.pages.reduce((m, p) => Math.max(m, p.pageNumber), 0);
    const startRaw = form.get('startNumber');
    let start = maxExisting + 1;
    if (typeof startRaw === 'string' && startRaw.trim()) {
      const parsed = Number(startRaw);
      if (Number.isInteger(parsed) && parsed >= 1) start = parsed;
    }

    const results: UploadResult[] = [];
    let nextNumber = start;
    let created = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const layout = layouts[i] === 'spread' ? 'spread' : 'single';
      try {
        if (file.size === 0) throw new Error('File is empty.');
        if (file.size > COMIC_MAX_BYTES) {
          throw new Error(`File is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is ${Math.floor(COMIC_MAX_BYTES / (1024 * 1024))} MB.`);
        }
        // Guard against page number collisions when a custom startNumber is used.
        while (story.pages.some((p) => p.pageNumber === nextNumber)) {
          nextNumber += 1;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const meta = await readComicImageMeta(buffer);
        if (!meta) throw new Error('Unsupported image format — use JPEG, PNG, WebP or GIF.');

        const stored = await uploadComicArtwork(id, 'pages', buffer, meta.mime);
        const page = await db.comicPage.create({
          data: {
            storyId: id,
            pageNumber: nextNumber,
            imagePath: stored.url,
            isSpread: layout === 'spread',
            width: meta.width,
            height: meta.height,
            fileSize: file.size,
            originalName: file.name.slice(0, 255),
          },
        });
        created += 1;
        results.push({
          filename: file.name,
          ok: true,
          page: {
            id: page.id,
            pageNumber: page.pageNumber,
            imagePath: page.imagePath,
            isSpread: page.isSpread,
            width: meta.width,
            height: meta.height,
            fileSize: file.size,
            storage: stored.storage,
          },
        });
        nextNumber += 1;
      } catch (fileErr) {
        const message = fileErr instanceof Error ? fileErr.message : 'Upload failed.';
        results.push({ filename: file.name, ok: false, error: message });
      }
    }

    if (created > 0) {
      await db.moderationAction.create({
        data: {
          adminId: admin.id,
          action: 'comic_pages_uploaded',
          targetStoryId: id,
          description: `Uploaded ${created} artwork asset(s) to Comic Bible story "${story.title}" (${id}) — numbers ${start}–${nextNumber - 1}`.slice(0, 500),
        },
      });
    }

    const failed = results.filter((r) => !r.ok).length;
    return NextResponse.json(
      { results, created, failed },
      { status: created > 0 ? 201 : 400 },
    );
  } catch (err) {
    console.error('Admin comic pages upload error:', err);
    return NextResponse.json({ error: 'Artwork upload failed.' }, { status: 500 });
  }
}
