import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/comics — list published comic stories
// Query params: ?testament=OT|NT&kids=1&search=...
// Public — anyone can browse the library.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testament = searchParams.get('testament'); // "OT" | "NT"
    const kids = searchParams.get('kids') === '1';
    const search = searchParams.get('search')?.trim();

    // Defense in depth for the "only valid artwork reaches the public
    // library" rule: publish validation already enforces ≥1 page; this
    // filter additionally guarantees a published story with zero page
    // assets (e.g. artwork deleted after publish) never lists publicly.
    const where: Record<string, unknown> = { published: true, pages: { some: {} } };
    if (testament) where.testament = testament;
    if (kids) where.isKidsFriendly = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const stories = await db.comicStory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { pages: true } },
      },
    });

    // Count pre-composed spread assets per story (truthful page metadata:
    // a story whose asset is one wide spread still has pageCount 1 — it is
    // one file that artwork-wise covers two printed pages).
    const storyIds = stories.map((s) => s.id);
    const spreadCounts = new Map<string, number>();
    if (storyIds.length > 0) {
      const spreadRows = await db.comicPage.groupBy({
        by: ['storyId'],
        where: { storyId: { in: storyIds }, isSpread: true },
        _count: { _all: true },
      });
      for (const row of spreadRows) {
        spreadCounts.set(row.storyId, row._count._all);
      }
    }

    // Get user's reading progress + bookmarks (if authenticated).
    const user = await getCurrentUser();
    let progressMap: Map<string, { lastPageRead: number }> = new Map();
    let bookmarkSet: Set<string> = new Set();
    if (user) {
      const [progress, bookmarks] = await Promise.all([
        db.comicReadingProgress.findMany({ where: { userId: user.id } }),
        db.comicBookmark.findMany({ where: { userId: user.id }, select: { storyId: true } }),
      ]);
      progressMap = new Map(progress.map((p) => [p.storyId, { lastPageRead: p.lastPageRead }]));
      bookmarkSet = new Set(bookmarks.map((b) => b.storyId));
    }

    return NextResponse.json({
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
        isKidsFriendly: s.isKidsFriendly,
        ageGroup: s.ageGroup,
        pageLayout: s.pageLayout,
        pageCount: s._count.pages,
        spreadAssets: spreadCounts.get(s.id) ?? 0,
        readingProgress: progressMap.get(s.id)?.lastPageRead ?? null,
        bookmarked: bookmarkSet.has(s.id),
      })),
      total: stories.length,
    });
  } catch (error) {
    console.error('Comic list error:', error);
    return NextResponse.json({ error: 'Failed to load comics.' }, { status: 500 });
  }
}
