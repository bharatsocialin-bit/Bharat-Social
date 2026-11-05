import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/comics/[id] — fetch a single comic story with pages + translation
// Query params: ?lang=en (language code for translation)
// Public — anyone can read.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    const story = await db.comicStory.findUnique({
      where: { id, published: true },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
        translations: { where: { languageCode: lang } },
      },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    // Get user's reading progress (if authenticated).
    const user = await getCurrentUser();
    let lastPageRead: number | null = null;
    let bookmarked = false;
    if (user) {
      const [progress, bookmark] = await Promise.all([
        db.comicReadingProgress.findUnique({ where: { userId_storyId: { userId: user.id, storyId: id } } }),
        db.comicBookmark.findUnique({ where: { userId_storyId: { userId: user.id, storyId: id } } }),
      ]);
      lastPageRead = progress?.lastPageRead ?? null;
      bookmarked = !!bookmark;
    }

    const translation = story.translations[0];
    const translationStatus = translation?.status || 'coming_soon';

    return NextResponse.json({
      story: {
        id: story.id,
        title: translation?.title || story.title,
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
        pages: story.pages.map((p) => ({
          id: p.id,
          pageNumber: p.pageNumber,
          imagePath: p.imagePath,
          isSpread: p.isSpread,
        })),
        translation: translation
          ? {
              title: translation.title,
              introduction: translation.introduction,
              narration: translation.narration,
              dialogue: translation.dialogue,
              scripture: translation.scripture,
              lesson: translation.lesson,
              prayer: translation.prayer,
              status: translationStatus,
            }
          : null,
        translationStatus,
        lastPageRead,
        bookmarked,
      },
    });
  } catch (error) {
    console.error('Comic detail error:', error);
    return NextResponse.json({ error: 'Failed to load story.' }, { status: 500 });
  }
}
