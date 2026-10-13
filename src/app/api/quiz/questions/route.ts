import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── GET /api/quiz/questions?categoryId=cat-gk&count=5 ───────────────────────
// OR: /api/quiz/questions?ids=id1,id2,id3  (fetch specific questions by ID)
//
// Returns a randomized set of PUBLISHED questions for a category.
//
// This route is intentionally public (anyone can browse published questions —
// no auth required). The correct answer index is NEVER included in the
// response — the client only sees the question text, options, translations,
// and metadata. The client submits its selected option indices via POST
// /api/quiz/attempts, and the server scores them against the DB.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const idsParam = searchParams.get('ids'); // comma-separated question IDs
    const requestedCount = parseInt(searchParams.get('count') || '5', 10);
    const difficulty = searchParams.get('difficulty'); // 'easy' | 'medium' | 'hard' | null
    const count = Math.min(Math.max(requestedCount || 5, 1), 20);

    // ── Branch 1: fetch by specific IDs (used by the daily quiz) ──
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
      if (ids.length === 0) {
        return NextResponse.json({ error: 'ids parameter is empty.' }, { status: 400 });
      }
      const questions = await db.quizQuestion.findMany({
        where: { id: { in: ids }, published: true },
        select: {
          id: true,
          categoryId: true,
          text: true,
          translations: true,
          options: true,
          explanation: true,
          explanationTranslations: true,
          source: true,
          difficulty: true,
          language: true,
          timeLimitSeconds: true,
        },
      });
      // Re-order to match the requested IDs order (in case the DB returned
      // them in a different order).
      const byId = new Map(questions.map((q) => [q.id, q]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

      const transformed = ordered.map((q) => ({
        id: q!.id,
        categoryId: q!.categoryId,
        text: q!.text,
        translations: safeParse(q!.translations, {}),
        options: safeParse(q!.options, []).map((o: { id: string; text: string; translations?: Record<string, string> }) => ({
          id: o.id,
          text: o.text,
          translations: o.translations || {},
        })),
        explanation: q!.explanation,
        explanationTranslations: safeParse(q!.explanationTranslations, {}),
        source: q!.source,
        difficulty: q!.difficulty,
        language: q!.language,
        timeLimitSeconds: q!.timeLimitSeconds,
      }));
      return NextResponse.json({ questions: transformed, count: transformed.length });
    }

    // ── Branch 2: fetch random questions from a category ──
    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId (or ids) is required.' },
        { status: 400 },
      );
    }

    const where: Record<string, unknown> = {
      categoryId,
      published: true,
    };
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      where.difficulty = difficulty;
    }

    const allQuestions = await db.quizQuestion.findMany({
      where,
      select: {
        id: true,
        categoryId: true,
        text: true,
        translations: true,
        options: true,
        explanation: true,
        explanationTranslations: true,
        source: true,
        difficulty: true,
        language: true,
        timeLimitSeconds: true,
      },
    });

    // Fisher-Yates shuffle.
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, count);

    // IMPORTANT: strip the correctOptionIndex from the response. The
    // client never sees which option is correct until AFTER it submits
    // and the server responds with the graded result.
    const transformed = selected.map((q) => ({
      id: q.id,
      categoryId: q.categoryId,
      text: q.text,
      translations: safeParse(q.translations, {}),
      options: safeParse(q.options, []).map((o: { id: string; text: string; translations?: Record<string, string> }) => ({
        id: o.id,
        text: o.text,
        translations: o.translations || {},
      })),
      explanation: q.explanation,
      explanationTranslations: safeParse(q.explanationTranslations, {}),
      source: q.source,
      difficulty: q.difficulty,
      language: q.language,
      timeLimitSeconds: q.timeLimitSeconds,
    }));

    return NextResponse.json({
      questions: transformed,
      count: transformed.length,
    });
  } catch (e) {
    console.error('Error fetching quiz questions:', e);
    return NextResponse.json({ error: 'Failed to fetch questions.' }, { status: 500 });
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

// ── POST /api/quiz/questions/[id]/check ────────────────────────────────────
// Not implemented — see /api/quiz/attempts for the submission endpoint.
// (This stub is here to document that scoring happens server-side only.)
