import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { BIBLE_BOOKS_BY_USFM } from '@/lib/bible/books';

// ── GET /api/admin/comics — list ALL stories (any workflow status) ────────
export async function GET(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // draft | review | published
    const search = searchParams.get('search')?.trim();

    const where: Record<string, unknown> = {};
    if (status === 'draft' || status === 'review' || status === 'published') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const stories = await db.comicStory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      include: {
        _count: { select: { pages: true, translations: true } },
        pages: { select: { isSpread: true } },
        translations: { select: { languageCode: true, status: true } },
      },
    });

    return NextResponse.json({
      admin: { id: admin.id, username: admin.username },
      stories: stories.map((s) => ({
        id: s.id,
        title: s.title,
        testament: s.testament,
        category: s.category,
        bibleBook: s.bibleBook,
        bibleChapter: s.bibleChapter,
        bibleVerse: s.bibleVerse,
        coverImagePath: s.coverImagePath,
        description: s.description,
        pageLayout: s.pageLayout,
        isKidsFriendly: s.isKidsFriendly,
        status: s.status,
        published: s.published,
        publishedAt: s.publishedAt?.toISOString() ?? null,
        pageCount: s._count.pages,
        spreadAssets: s.pages.filter((p) => p.isSpread).length,
        translationCount: s._count.translations,
        translationsPublished: s.translations.filter((t) => t.status === 'published').length,
        updatedAt: s.updatedAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
      total: stories.length,
    });
  } catch (err) {
    console.error('Admin comics list error:', err);
    return NextResponse.json({ error: 'Failed to load stories.' }, { status: 500 });
  }
}

// ── POST /api/admin/comics — create a new story (starts as draft) ─────────
export async function POST(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    const { title, testament, category, bibleBook, description } = body as Record<string, unknown>;

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) {
      return NextResponse.json({ error: 'Story title is required.' }, { status: 400 });
    }
    if (cleanTitle.length > 200) {
      return NextResponse.json({ error: 'Story title must be 200 characters or fewer.' }, { status: 400 });
    }

    const cleanTestament = testament === 'NT' ? 'NT' : 'OT';
    let book: string | null = null;
    if (typeof bibleBook === 'string' && bibleBook.trim()) {
      const found = BIBLE_BOOKS_BY_USFM[bibleBook.trim().toUpperCase()];
      if (!found) {
        return NextResponse.json({ error: 'Unknown Bible book.' }, { status: 400 });
      }
      if (found.testament !== cleanTestament) {
        return NextResponse.json(
          { error: `${found.name} is a ${found.testament} Testament book.` },
          { status: 400 },
        );
      }
      book = found.usfm;
    }

    const cleanCategory =
      typeof category === 'string' && category.trim() ? category.trim().slice(0, 100) : cleanTitle;

    const story = await db.comicStory.create({
      data: {
        title: cleanTitle,
        testament: cleanTestament,
        category: cleanCategory,
        bibleBook: book,
        description: typeof description === 'string' ? description.trim().slice(0, 4000) : null,
        status: 'draft',
        published: false,
        pageLayout: 'spread', // Lordsbook comics default to spread layout; editable later
        sortOrder: 0,
      },
    });

    // Seed the English translation row so translation work has a base and
    // the translations manager shows English as started.
    await db.comicTranslation.create({
      data: { storyId: story.id, languageCode: 'en', title: cleanTitle, status: 'draft' },
    });

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_story_created',
        targetStoryId: story.id,
        description: `Created Comic Bible story "${cleanTitle}" (${story.id})`,
      },
    });

    return NextResponse.json({ story: { id: story.id, title: story.title, status: story.status } }, { status: 201 });
  } catch (err) {
    console.error('Admin comic create error:', err);
    return NextResponse.json({ error: 'Failed to create story.' }, { status: 500 });
  }
}
