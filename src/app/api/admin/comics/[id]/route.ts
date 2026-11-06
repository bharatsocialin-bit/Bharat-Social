import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { BIBLE_BOOKS_BY_USFM } from '@/lib/bible/books';
import { validateStoryForPublish } from '@/lib/comics/validate';
import { deleteComicArtwork, isRepoStaticArtwork } from '@/lib/comics/storage';

const ALLOWED_STATUS = new Set(['draft', 'review', 'published']);
const ALLOWED_LAYOUT = new Set(['single', 'spread']);
const AGE_GROUPS = new Set(['3-5', '6-8', '9-12']);

// ── GET /api/admin/comics/[id] — full editor detail + publish readiness ───
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const story = await db.comicStory.findUnique({
      where: { id },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
        translations: { orderBy: { languageCode: 'asc' } },
      },
    });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    const validation = await validateStoryForPublish(id);

    return NextResponse.json({
      admin: { id: admin.id, username: admin.username },
      story: {
        id: story.id,
        title: story.title,
        testament: story.testament,
        category: story.category,
        bibleBook: story.bibleBook,
        bibleChapter: story.bibleChapter,
        bibleVerse: story.bibleVerse,
        coverImagePath: story.coverImagePath,
        description: story.description,
        keyVerse: story.keyVerse,
        keyVerseRef: story.keyVerseRef,
        lesson: story.lesson,
        prayer: story.prayer,
        isKidsFriendly: story.isKidsFriendly,
        ageGroup: story.ageGroup,
        pageLayout: story.pageLayout,
        status: story.status,
        published: story.published,
        publishedAt: story.publishedAt?.toISOString() ?? null,
        publishedBy: story.publishedBy,
        sortOrder: story.sortOrder,
        createdAt: story.createdAt.toISOString(),
        updatedAt: story.updatedAt.toISOString(),
        pages: story.pages.map((p) => ({
          id: p.id,
          pageNumber: p.pageNumber,
          imagePath: p.imagePath,
          isSpread: p.isSpread,
          width: p.width,
          height: p.height,
          fileSize: p.fileSize,
          originalName: p.originalName,
          createdAt: p.createdAt.toISOString(),
        })),
        translations: story.translations.map((t) => ({
          id: t.id,
          languageCode: t.languageCode,
          title: t.title,
          introduction: t.introduction,
          narration: t.narration,
          dialogue: t.dialogue,
          captions: t.captions,
          scripture: t.scripture,
          lesson: t.lesson,
          prayer: t.prayer,
          status: t.status,
          updatedAt: t.updatedAt.toISOString(),
        })),
      },
      validation,
    });
  } catch (err) {
    console.error('Admin comic detail error:', err);
    return NextResponse.json({ error: 'Failed to load story.' }, { status: 500 });
  }
}

// ── PATCH /api/admin/comics/[id] — update story details ───────────────────
export async function PATCH(
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if (b.title !== undefined) {
      const t = typeof b.title === 'string' ? b.title.trim() : '';
      if (!t) return NextResponse.json({ error: 'Story title cannot be empty.' }, { status: 400 });
      if (t.length > 200) return NextResponse.json({ error: 'Story title must be 200 characters or fewer.' }, { status: 400 });
      data.title = t;
    }
    if (b.testament !== undefined) {
      if (b.testament !== 'OT' && b.testament !== 'NT') {
        return NextResponse.json({ error: 'Testament must be OT or NT.' }, { status: 400 });
      }
      data.testament = b.testament;
    }
    if (b.category !== undefined) {
      data.category = typeof b.category === 'string' && b.category.trim() ? b.category.trim().slice(0, 100) : story.title;
    }
    if (b.bibleBook !== undefined) {
      if (b.bibleBook === null || b.bibleBook === '') {
        data.bibleBook = null;
        data.bibleChapter = null;
        data.bibleVerse = null;
      } else {
        const found = BIBLE_BOOKS_BY_USFM[String(b.bibleBook).trim().toUpperCase()];
        if (!found) return NextResponse.json({ error: 'Unknown Bible book.' }, { status: 400 });
        const targetTestament = (data.testament as string) ?? story.testament;
        if (found.testament !== targetTestament) {
          return NextResponse.json({ error: `${found.name} is a ${found.testament} Testament book.` }, { status: 400 });
        }
        data.bibleBook = found.usfm;
      }
    }
    if (b.bibleChapter !== undefined) {
      if (b.bibleChapter === null || b.bibleChapter === '') {
        data.bibleChapter = null;
      } else {
        const chapter = Number(b.bibleChapter);
        if (!Number.isInteger(chapter) || chapter < 1) {
          return NextResponse.json({ error: 'Chapter must be a positive whole number.' }, { status: 400 });
        }
        const bookCode = (data.bibleBook as string | null) ?? story.bibleBook;
        const book = bookCode ? BIBLE_BOOKS_BY_USFM[bookCode] : undefined;
        if (book && chapter > book.chapters) {
          return NextResponse.json({ error: `${book.name} has ${book.chapters} chapters.` }, { status: 400 });
        }
        data.bibleChapter = chapter;
      }
    }
    if (b.bibleVerse !== undefined) {
      if (b.bibleVerse === null || b.bibleVerse === '') {
        data.bibleVerse = null;
      } else {
        const verse = Number(b.bibleVerse);
        if (!Number.isInteger(verse) || verse < 1) {
          return NextResponse.json({ error: 'Verse must be a positive whole number.' }, { status: 400 });
        }
        data.bibleVerse = verse;
      }
    }
    for (const field of ['description', 'keyVerse', 'keyVerseRef', 'lesson', 'prayer'] as const) {
      if (b[field] !== undefined) {
        data[field] = typeof b[field] === 'string' && b[field].trim() ? b[field].trim().slice(0, 4000) : null;
      }
    }
    if (b.isKidsFriendly !== undefined) data.isKidsFriendly = !!b.isKidsFriendly;
    if (b.ageGroup !== undefined) {
      if (b.ageGroup === null || b.ageGroup === '') {
        data.ageGroup = null;
      } else if (typeof b.ageGroup === 'string' && AGE_GROUPS.has(b.ageGroup)) {
        data.ageGroup = b.ageGroup;
      } else {
        return NextResponse.json({ error: 'Age group must be 3-5, 6-8 or 9-12.' }, { status: 400 });
      }
    }
    if (b.pageLayout !== undefined) {
      if (!ALLOWED_LAYOUT.has(String(b.pageLayout))) {
        return NextResponse.json({ error: 'Page layout must be "single" or "spread".' }, { status: 400 });
      }
      data.pageLayout = b.pageLayout;
    }
    if (b.sortOrder !== undefined) {
      const order = Number(b.sortOrder);
      if (!Number.isInteger(order) || order < 0) {
        return NextResponse.json({ error: 'Sort order must be a non-negative integer.' }, { status: 400 });
      }
      data.sortOrder = order;
    }
    // Direct status edits are NOT allowed through PATCH — workflow moves go
    // through /workflow (which validates before publishing).

    const updated = await db.comicStory.update({ where: { id }, data });

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_story_updated',
        targetStoryId: id,
        description: `Updated details of Comic Bible story "${updated.title}" (${id}) — fields: ${Object.keys(data).join(', ') || 'none'}`.slice(0, 500),
      },
    });

    return NextResponse.json({ story: { id: updated.id, title: updated.title, status: updated.status } });
  } catch (err) {
    console.error('Admin comic update error:', err);
    return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 });
  }
}

// ── DELETE /api/admin/comics/[id] — delete story + its artwork ────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    if (request.headers.get('x-confirm-delete') !== 'true') {
      return NextResponse.json({ error: 'Missing x-confirm-delete header.' }, { status: 400 });
    }

    const story = await db.comicStory.findUnique({
      where: { id },
      include: { pages: { select: { imagePath: true } } },
    });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    await db.comicStory.delete({ where: { id } }); // cascades pages + translations

    // Best-effort cleanup of uploaded artwork. Repo-shipped static files are
    // never touched (deleteComicArtwork guards them).
    for (const page of story.pages) {
      if (!isRepoStaticArtwork(page.imagePath)) await deleteComicArtwork(page.imagePath);
    }
    if (story.coverImagePath && !isRepoStaticArtwork(story.coverImagePath)) {
      await deleteComicArtwork(story.coverImagePath);
    }

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_story_deleted',
        targetStoryId: id,
        description: `Deleted Comic Bible story "${story.title}" (${id}) with ${story.pages.length} page asset(s)`,
      },
    });

    return NextResponse.json({ success: true, message: 'Story deleted.' });
  } catch (err) {
    console.error('Admin comic delete error:', err);
    return NextResponse.json({ error: 'Failed to delete story.' }, { status: 500 });
  }
}
