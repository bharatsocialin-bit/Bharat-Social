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

    const where: Record<string, unknown> = { published: true };
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
