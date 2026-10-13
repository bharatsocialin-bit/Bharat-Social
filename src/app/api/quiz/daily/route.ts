import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { istTodayDate } from '@/lib/quiz/ist';

// ── GET /api/quiz/daily ─────────────────────────────────────────────────────
// Returns today's daily challenge: a set of question IDs curated for today's
// IST date. The actual question TEXT and options are NOT included here —
// the client must call /api/quiz/questions?... to fetch them. We do this
// so the daily route can stay tiny and the question-fetching route can
// apply its own "never expose correct answer" logic.
//
// If no admin-curated QuizDailySet exists for today, we deterministically
// pick a random-but-stable set of 5 published questions across categories,
// keyed by today's date — so every user in India sees the SAME daily
// challenge on the same IST date.
export async function GET() {
  try {
    const todayIst = istTodayDate();

    // 1. Check for an admin-curated daily set.
    const curated = await db.quizDailySet.findUnique({
      where: { date: todayIst },
    });

    let questionIds: string[] = [];
    let title: string;
    let source: 'curated' | 'fallback';

    if (curated) {
      questionIds = safeParse(curated.questionIds, []);
      title = curated.title;
      source = 'curated';
    } else {
      // 2. Fallback: deterministic random selection of 5 published questions.
      // We use a seed based on today's date so every user gets the same set.
      const allPublished = await db.quizQuestion.findMany({
        where: { published: true },
        select: { id: true, categoryId: true },
      });
      if (allPublished.length === 0) {
        return NextResponse.json({
          date: todayIst,
          title: 'Today\'s Daily Challenge',
          questionIds: [],
          source: 'empty',
          hasCompletedToday: false,
          message: 'No questions are available yet. Please check back later.',
        });
      }
      // Deterministic shuffle: sort by hash(date + questionId).
      const seed = todayIst;
      const sorted = [...allPublished].sort((a, b) => {
        return hashStr(seed + a.id) - hashStr(seed + b.id);
      });
      // Pick at most 5 questions, ideally spread across categories.
      const picked: typeof sorted = [];
      const usedCategories = new Set<string>();
      // First pass: pick one per category until we have 5.
      for (const q of sorted) {
        if (picked.length >= 5) break;
        if (!usedCategories.has(q.categoryId)) {
          picked.push(q);
          usedCategories.add(q.categoryId);
        }
      }
      // Second pass: fill remaining slots with any.
      for (const q of sorted) {
        if (picked.length >= 5) break;
        if (!picked.includes(q)) picked.push(q);
      }
      questionIds = picked.map((q) => q.id).slice(0, 5);
      title = `Daily Challenge — ${todayIst}`;
      source = 'fallback';
    }

    // 3. Verify all question IDs still exist (in case a question was
    //    unpublished after the daily set was curated).
    if (questionIds.length > 0) {
      const validQuestions = await db.quizQuestion.findMany({
        where: { id: { in: questionIds }, published: true },
        select: { id: true },
      });
      const validIds = new Set(validQuestions.map((q) => q.id));
      questionIds = questionIds.filter((id) => validIds.has(id));
    }

    // 4. Check if the current user has already completed today's challenge.
    let hasCompletedToday = false;
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const existing = await db.quizAttempt.findFirst({
        where: {
          userId: currentUser.id,
          type: 'daily',
          refId: todayIst,
        },
        select: {
          id: true,
          totalPoints: true,
          correctCount: true,
          totalQuestions: true,
          finishedAt: true,
        },
      });
      if (existing) {
        hasCompletedToday = true;
      }
    }

    return NextResponse.json({
      date: todayIst,
      title,
      questionIds,
      count: questionIds.length,
      source,
      hasCompletedToday,
    });
  } catch (e) {
    console.error('Error fetching daily quiz:', e);
    return NextResponse.json({ error: 'Failed to fetch daily challenge.' }, { status: 500 });
  }
}

// Stable string hash — used for deterministic shuffle.
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
