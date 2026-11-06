import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { comicLanguageCatalog, normalizeTranslationStatus } from '@/lib/comics/languages';

/**
 * PATCH /api/admin/comics/[id]/translations/[languageCode]
 * Upsert (create-or-update) one language translation row for a story.
 *
 * Body (all fields optional — only provided fields are written):
 *   { title, introduction, narration, dialogue, captions, scripture, lesson, prayer, status }
 *
 * Artwork is shared across languages — this route only writes text. The
 * language code MUST appear in the Lordsbook Bible language catalog (no
 * invented languages). `status` is normalized to one of
 * draft | in_review | published (legacy "coming_soon" → draft).
 */
const TEXT_FIELDS = ['title', 'introduction', 'narration', 'dialogue', 'captions', 'scripture', 'lesson', 'prayer'] as const;
const ALLOWED_STATUS = new Set(['draft', 'in_review', 'published']);

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; languageCode: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id, languageCode } = await params;
    const lc = languageCode.toLowerCase();

    // Validate the language code against the real Lordsbook Bible catalog.
    const catalog = comicLanguageCatalog();
    const known = catalog.find((c) => c.code.toLowerCase() === lc);
    if (!known) {
      return NextResponse.json(
        { error: `Language "${languageCode}" is not supported by the Lordsbook Bible system.` },
        { status: 400 },
      );
    }

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
    for (const field of TEXT_FIELDS) {
      if (b[field] !== undefined) {
        // title is the only required-ish field; allow null on others.
        const max = field === 'title' ? 300 : 20000;
        data[field] = cleanText(b[field], max);
        if (field === 'title' && !data[field]) {
          return NextResponse.json({ error: 'Translation title cannot be empty.' }, { status: 400 });
        }
      }
    }
    if (b.status !== undefined) {
      const raw = typeof b.status === 'string' ? b.status : '';
      if (!ALLOWED_STATUS.has(raw)) {
        return NextResponse.json(
          { error: 'status must be one of draft, in_review, published.' },
          { status: 400 },
        );
      }
      data.status = normalizeTranslationStatus(raw);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
    }

    // Title fallback: when creating a new row without a title, use the story title.
    if (data.title === undefined) {
      const existing = await db.comicTranslation.findUnique({
        where: { storyId_languageCode: { storyId: id, languageCode: lc } },
        select: { title: true },
      });
      if (!existing) data.title = story.title;
    }

    const translation = await db.comicTranslation.upsert({
      where: { storyId_languageCode: { storyId: id, languageCode: lc } },
      update: data,
      create: {
        storyId: id,
        languageCode: lc,
        title: (data.title as string) ?? story.title,
        introduction: (data.introduction as string | null) ?? null,
        narration: (data.narration as string | null) ?? null,
        dialogue: (data.dialogue as string | null) ?? null,
        captions: (data.captions as string | null) ?? null,
        scripture: (data.scripture as string | null) ?? null,
        lesson: (data.lesson as string | null) ?? null,
        prayer: (data.prayer as string | null) ?? null,
        status: (data.status as string) ?? 'draft',
      },
    });

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_translation_updated',
        targetStoryId: id,
        description: `Updated ${known.name} translation for Comic Bible story "${story.title}" (${id}) — fields: ${Object.keys(data).join(', ')}`.slice(0, 500),
      },
    });

    return NextResponse.json({
      translation: {
        id: translation.id,
        languageCode: translation.languageCode,
        title: translation.title,
        status: translation.status,
        updatedAt: translation.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('Admin comic translation save error:', err);
    return NextResponse.json({ error: 'Failed to save translation.' }, { status: 500 });
  }
}

// ── DELETE — remove a translation row (back to "Not Started") ──────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; languageCode: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id, languageCode } = await params;
    const lc = languageCode.toLowerCase();
    if (request.headers.get('x-confirm-delete') !== 'true') {
      return NextResponse.json({ error: 'Missing x-confirm-delete header.' }, { status: 400 });
    }

    const story = await db.comicStory.findUnique({ where: { id } });
    if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });

    const row = await db.comicTranslation.findUnique({
      where: { storyId_languageCode: { storyId: id, languageCode: lc } },
    });
    if (!row) {
      return NextResponse.json({ success: true, message: 'Translation row did not exist.' });
    }

    await db.comicTranslation.delete({ where: { id: row.id } });

    await db.moderationAction.create({
      data: {
        adminId: admin.id,
        action: 'comic_translation_deleted',
        targetStoryId: id,
        description: `Removed ${lc} translation row from Comic Bible story "${story.title}" (${id})`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin comic translation delete error:', err);
    return NextResponse.json({ error: 'Failed to delete translation.' }, { status: 500 });
  }
}
