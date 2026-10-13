import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// ── GET /api/admin/quiz-questions ───────────────────────────────────────────
// Admin-only: list all quiz questions (including unpublished).
//
// Returns the correctOptionIndex so admins can verify answers when editing.
export async function GET(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(requestedLimit || 50, 1), 200);
    const cursor = searchParams.get('cursor');

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;

    const questions = await db.quizQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = questions.length > limit;
    const items = hasMore ? questions.slice(0, limit) : questions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
      questions: items.map((q) => ({
        id: q.id,
        categoryId: q.categoryId,
        text: q.text,
        translations: safeParse(q.translations, {}),
        options: safeParse(q.options, []),
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        explanationTranslations: safeParse(q.explanationTranslations, {}),
        source: q.source,
        difficulty: q.difficulty,
        language: q.language,
        timeLimitSeconds: q.timeLimitSeconds,
        published: q.published,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
      nextCursor,
      admin: admin ? { id: admin.id, username: admin.username } : null,
    });
  } catch (e) {
    console.error('Admin quiz questions list error:', e);
    return NextResponse.json({ error: 'Failed to fetch questions.' }, { status: 500 });
  }
}

// ── POST /api/admin/quiz-questions ────────────────────────────────────────
// Admin-only: create a new quiz question.
//
// Body:
//   {
//     categoryId: string,
//     text: string,
//     translations?: Record<string, string>,
//     options: Array<{ id: string; text: string; translations?: Record<string, string> }>,
//     correctOptionId: string,        // must match one of the option ids
//     explanation: string,
//     explanationTranslations?: Record<string, string>,
//     source?: string,
//     difficulty: 'easy' | 'medium' | 'hard',
//     language?: string (default 'en'),
//     timeLimitSeconds?: number,
//     published?: boolean (default false — admin reviews before publishing)
//   }
export async function POST(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const {
      categoryId,
      text,
      translations,
      options,
      correctOptionId,
      explanation,
      explanationTranslations,
      source,
      difficulty,
      language,
      timeLimitSeconds,
      published,
    } = body;

    // ── Validate inputs ──
    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json({ error: 'categoryId is required.' }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Question text is required.' }, { status: 400 });
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: 'Question text is too long (max 1000 chars).' }, { status: 400 });
    }
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return NextResponse.json({ error: 'Options must be an array of 2-6 items.' }, { status: 400 });
    }
    // Validate each option has an id and non-empty text.
    for (const opt of options) {
      if (!opt.id || typeof opt.id !== 'string') {
        return NextResponse.json({ error: 'Each option must have an id.' }, { status: 400 });
      }
      if (!opt.text || typeof opt.text !== 'string' || opt.text.trim().length === 0) {
        return NextResponse.json({ error: 'Each option must have non-empty text.' }, { status: 400 });
      }
    }
    // correctOptionId must match one of the option ids.
    const correctIdx = options.findIndex((o: { id: string }) => o.id === correctOptionId);
    if (correctIdx < 0) {
      return NextResponse.json(
        { error: 'correctOptionId must match one of the option ids.' },
        { status: 400 },
      );
    }
    if (!explanation || typeof explanation !== 'string' || explanation.trim().length === 0) {
      return NextResponse.json({ error: 'Explanation is required.' }, { status: 400 });
    }
    if (explanation.length > 2000) {
      return NextResponse.json({ error: 'Explanation is too long (max 2000 chars).' }, { status: 400 });
    }
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json(
        { error: 'difficulty must be one of: easy, medium, hard.' },
        { status: 400 },
      );
    }
    if (timeLimitSeconds !== undefined && timeLimitSeconds !== null) {
      const t = Number(timeLimitSeconds);
      if (!Number.isFinite(t) || t < 0 || t > 600) {
        return NextResponse.json({ error: 'timeLimitSeconds must be 0-600.' }, { status: 400 });
      }
    }

    // ── Persist ──
    const created = await db.quizQuestion.create({
      data: {
        categoryId,
        text: text.trim(),
        translations: JSON.stringify(translations || {}),
        options: JSON.stringify(options),
        correctOptionIndex: correctIdx,
        explanation: explanation.trim(),
        explanationTranslations: JSON.stringify(explanationTranslations || {}),
        source: source?.trim() || null,
        difficulty,
        language: language || 'en',
        timeLimitSeconds: timeLimitSeconds ?? null,
        published: published === true,
        createdBy: admin!.id,
      },
    });

    return NextResponse.json(
      {
        question: {
          id: created.id,
          categoryId: created.categoryId,
          text: created.text,
          published: created.published,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('Admin quiz question create error:', e);
    return NextResponse.json({ error: 'Failed to create question.' }, { status: 500 });
  }
}

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
