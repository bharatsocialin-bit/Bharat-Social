import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { comicLanguageCatalog } from '@/lib/comics/languages';

// GET /api/admin/comics/[id]/translations — language catalog + current rows.
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
      include: { translations: { orderBy: { languageCode: 'asc' } } },
    });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    return NextResponse.json({
      admin: { id: admin.id, username: admin.username },
      catalog: comicLanguageCatalog(),
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
    });
  } catch (err) {
    console.error('Admin comic translations list error:', err);
    return NextResponse.json({ error: 'Failed to load translations.' }, { status: 500 });
  }
}
