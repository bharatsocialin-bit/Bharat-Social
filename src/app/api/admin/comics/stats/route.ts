import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { comicLanguageCatalog } from '@/lib/comics/languages';

// GET /api/admin/comics/stats — Comic Bible CMS dashboard counters.
export async function GET() {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const [totalStories, publishedStories, reviewStories, draftStories, pageCount, spreadCount, translationsByStatus, translationsByLang, publishedLangRows] =
      await Promise.all([
        db.comicStory.count(),
        db.comicStory.count({ where: { status: 'published' } }),
        db.comicStory.count({ where: { status: 'review' } }),
        db.comicStory.count({ where: { status: 'draft' } }),
        db.comicPage.count(),
        db.comicPage.count({ where: { isSpread: true } }),
        db.comicTranslation.groupBy({ by: ['status'], _count: { _all: true } }),
        db.comicTranslation.groupBy({ by: ['languageCode'], _count: { _all: true } }),
        db.comicTranslation.findMany({ where: { status: 'published' }, select: { languageCode: true } }),
      ]);

    const catalog = comicLanguageCatalog();
    const statusCount = (status: string) =>
      translationsByStatus.find((t) => t.status === status)?._count._all ?? 0;

    // A translation row exists for these languages (any status).
    const startedLanguages = new Set(translationsByLang.map((t) => t.languageCode));
    const publishedLanguages = new Set(publishedLangRows.map((t) => t.languageCode));

    return NextResponse.json({
      admin: { id: admin.id, username: admin.username },
      stories: {
        total: totalStories,
        published: publishedStories,
        review: reviewStories,
        draft: draftStories,
      },
      artwork: {
        totalAssets: pageCount,
        spreadAssets: spreadCount,
        singleAssets: pageCount - spreadCount,
      },
      translations: {
        supportedLanguages: catalog.length,
        startedLanguages: startedLanguages.size,
        publishedLanguages: publishedLanguages.size,
        publishedCount: statusCount('published'),
        inReviewCount: statusCount('in_review'),
        draftCount: statusCount('draft'),
      },
    });
  } catch (err) {
    console.error('Comic CMS stats error:', err);
    return NextResponse.json({ error: 'Failed to load Comic Bible stats.' }, { status: 500 });
  }
}
