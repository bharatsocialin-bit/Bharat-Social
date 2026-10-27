import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { istTodayDate, istDateAgo } from '@/lib/quiz/ist';
import { evaluateAndAwardAchievements } from '@/lib/quiz/achievements';
import { evaluateAndAwardBadges } from '@/lib/badges/evaluator';

// ── GET /api/quiz/attempts ──────────────────────────────────────────────────
// Returns the current user's quiz attempt history (most recent first).
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(requestedLimit || 20, 1), 100);

    const attempts = await db.quizAttempt.findMany({
      where: { userId: currentUser.id },
      orderBy: { finishedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      attempts: attempts.map((a) => ({
        id: a.id,
        type: a.type,
        refId: a.refId,
        totalPoints: a.totalPoints,
        correctCount: a.correctCount,
        totalQuestions: a.totalQuestions,
        startedAt: a.startedAt.toISOString(),
        finishedAt: a.finishedAt.toISOString(),
        answers: safeParse(a.answers, []),
        questionIds: safeParse(a.questionIds, []),
      })),
    });
  } catch (e) {
    console.error('Error fetching attempts:', e);
    return NextResponse.json({ error: 'Failed to fetch attempts.' }, { status: 500 });
  }
}

// ── POST /api/quiz/attempts ────────────────────────────────────────────────
// Submit a quiz attempt for server-side scoring.
//
// Request body:
//   {
//     type: 'category' | 'daily',
//     refId: string,            // categoryId or YYYY-MM-DD
//     startedAt: string (ISO),
//     questionIds: string[],   // the question IDs that were asked
//     answers: Array<{          // one per question
//       questionId: string,
//       selectedOptionIndex: number | null,  // null = unanswered/timed out
//       timeTakenSeconds?: number
//     }>
//   }
//
// Server responsibilities:
//   1. Validate that ALL questionIds exist and are published.
//   2. Verify that the question IDs match what we would have served
//      (for daily challenges: check against today's daily set or fallback).
//      For category quizzes: re-fetch the published questions in this
//      category and confirm they include all the IDs the client claims.
//   3. For each answer, look up the question's correctOptionIndex from
//      the DB. Compare to the client-submitted selectedOptionIndex.
//      Award 100 points for correct, 0 for incorrect or unanswered.
//   4. Compute totals server-side. NEVER trust a client-submitted score.
//   5. For daily challenges: enforce the "one per day" rule. If the user
//      has already submitted a daily attempt for the same IST date,
//      reject as 409.
//   6. Persist the attempt.
//   7. Award any newly-earned achievements.
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, refId, startedAt, questionIds, answers } = body;

    // ── Basic input validation ──
    if (type !== 'category' && type !== 'daily') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "category" or "daily".' },
        { status: 400 },
      );
    }
    if (!refId || typeof refId !== 'string') {
      return NextResponse.json({ error: 'refId is required.' }, { status: 400 });
    }
    if (!startedAt || typeof startedAt !== 'string') {
      return NextResponse.json({ error: 'startedAt is required.' }, { status: 400 });
    }
    const startedDate = new Date(startedAt);
    if (Number.isNaN(startedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startedAt.' }, { status: 400 });
    }
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'questionIds must be a non-empty array.' },
        { status: 400 },
      );
    }
    if (questionIds.length > 20) {
      return NextResponse.json(
        { error: 'Too many questions in a single attempt (max 20).' },
        { status: 400 },
      );
    }
    if (!Array.isArray(answers) || answers.length !== questionIds.length) {
      return NextResponse.json(
        { error: 'answers must be an array matching questionIds length.' },
        { status: 400 },
      );
    }

    // ── Daily challenge: enforce one-per-day (ATOMIC) ──
    if (type === 'daily') {
      // Verify refId is today's IST date — clients can only submit a daily
      // for "today", not for past dates (they're already locked) or future.
      const todayIst = istTodayDate();
      const yesterdayIst = istDateAgo(1);
      if (refId !== todayIst && refId !== yesterdayIst) {
        return NextResponse.json(
          { error: 'Daily challenge is no longer available for this date.' },
          { status: 400 },
        );
      }

      // ATOMIC CHECK: try to create a DailyQuizCompletion lock row.
      // If the unique constraint [userId, date] rejects, a concurrent
      // request already completed this daily challenge → return 409.
      // This closes the TOCTOU race that the old findFirst + create pattern
      // had (two concurrent requests could both pass the find and each
      // create their own QuizAttempt).
      try {
        await db.dailyQuizCompletion.create({
          data: {
            userId: currentUser.id,
            date: refId,
            attemptId: 'pending', // will be updated after the attempt is created
          },
        });
      } catch {
        // Unique constraint violation — user already completed this daily
        return NextResponse.json(
          { error: 'You have already completed today\'s daily challenge.' },
          { status: 409 },
        );
      }
    }

    // ── For category quizzes: enforce attempt rate limit (max 10 per hour) ──
    if (type === 'category') {
      const oneHourAgo = new Date(Date.now() - 60 * 60_000);
      const recentCount = await db.quizAttempt.count({
        where: {
          userId: currentUser.id,
          type: 'category',
          finishedAt: { gte: oneHourAgo },
        },
      });
      if (recentCount >= 10) {
        return NextResponse.json(
          { error: 'You\'ve completed many quizzes recently. Please try again later.' },
          { status: 429 },
        );
      }
    }

    // ── Fetch the questions from the DB ──
    // We look up by ID, validate that they're published, and (for category)
    // belong to the claimed category.
    //
    // For DAILY challenges, we IGNORE the client-supplied questionIds
    // entirely and resolve today's set server-side. This closes a cheat
    // where a user could submit a "daily" attempt with arbitrary published
    // question IDs they already knew the answers to. The client's
    // questionIds field is still required (for compatibility) but the
    // server uses its own list.
    let effectiveQuestionIds: string[] = questionIds;
    const questions: Array<{ id: string; categoryId: string; correctOptionIndex: number; options: string }> = [];
    if (type === 'daily') {
      // Re-resolve today's daily question IDs the same way /api/quiz/daily does.
      const curated = await db.quizDailySet.findUnique({
        where: { date: refId },
        select: { questionIds: true },
      });
      let dailyIds: string[] = [];
      if (curated) {
        try {
          const parsed = JSON.parse(curated.questionIds);
          if (Array.isArray(parsed)) {
            dailyIds = parsed.filter((x): x is string => typeof x === 'string');
          }
        } catch {
          dailyIds = [];
        }
      } else {
        // Fallback: deterministic-random selection — same algorithm as /api/quiz/daily.
        const allPublished = await db.quizQuestion.findMany({
          where: { published: true },
          select: { id: true, categoryId: true },
        });
        const seed = refId;
        const sorted = [...allPublished].sort((a, b) => hashStr(seed + a.id) - hashStr(seed + b.id));
        const picked: typeof sorted = [];
        const usedCategories = new Set<string>();
        for (const q of sorted) {
          if (picked.length >= 5) break;
          if (!usedCategories.has(q.categoryId)) {
            picked.push(q);
            usedCategories.add(q.categoryId);
          }
        }
        for (const q of sorted) {
          if (picked.length >= 5) break;
          if (!picked.includes(q)) picked.push(q);
        }
        dailyIds = picked.slice(0, 5).map((q) => q.id);
      }

      // Filter out any IDs that are no longer published.
      if (dailyIds.length > 0) {
        const valid = await db.quizQuestion.findMany({
          where: { id: { in: dailyIds }, published: true },
          select: { id: true },
        });
        const validSet = new Set(valid.map((q) => q.id));
        dailyIds = dailyIds.filter((id) => validSet.has(id));
      }

      if (dailyIds.length === 0) {
        return NextResponse.json(
          { error: 'No daily questions are available for this date.' },
          { status: 400 },
        );
      }
      effectiveQuestionIds = dailyIds;

      // Map the client's per-question answers onto the server's question order.
      // The client may have sent answers in a different order (or with extra/missing
      // entries). We pick out the ones that match the server's question IDs.
      const clientAnswerMap = new Map<string, { selectedOptionIndex: number | null; timeTakenSeconds: number }>();
      for (const a of answers) {
        if (a && typeof a.questionId === 'string') {
          clientAnswerMap.set(a.questionId, {
            selectedOptionIndex: typeof a.selectedOptionIndex === 'number' ? a.selectedOptionIndex : null,
            timeTakenSeconds: typeof a.timeTakenSeconds === 'number' ? a.timeTakenSeconds : 0,
          });
        }
      }
      // Re-derive the answers array in the SERVER's question order.
      // (The local `answers` variable below still references the original client array,
      // but we iterate by index over effectiveQuestionIds, so this is consistent.)
      const fetched = await db.quizQuestion.findMany({
        where: { id: { in: effectiveQuestionIds }, published: true },
        select: { id: true, categoryId: true, correctOptionIndex: true, options: true },
      });
      for (const q of fetched) questions.push(q);
      // Re-order fetched to match effectiveQuestionIds order.
      const byId = new Map(questions.map((q) => [q.id, q]));
      questions.length = 0;
      for (const qid of effectiveQuestionIds) {
        const q = byId.get(qid);
        if (q) questions.push(q);
      }
      // Stash the effective questionIds + a derived answers array back onto body
      // so the rest of the handler iterates over the correct list.
      // (The downstream loop reads `questionIds[i]` and `answers[i]` in lockstep.)
      const derivedAnswers = effectiveQuestionIds.map((qid) => {
        const ca = clientAnswerMap.get(qid);
        return {
          questionId: qid,
          selectedOptionIndex: ca?.selectedOptionIndex ?? null,
          timeTakenSeconds: ca?.timeTakenSeconds ?? 0,
        };
      });
      // Replace the const `questionIds` reference downstream by re-binding.
      // Since `questionIds` is `const`, we instead rebuild the answers loop to
      // iterate over effectiveQuestionIds and derivedAnswers explicitly below.
      // To keep the rest of the handler unchanged, we re-assign via a mutable local.
      // (We can't reassign `const questionIds`, so we rebind via a new variable
      // and update the loops further down.)
      // See the loop below — it uses `effectiveQuestionIds` and `derivedAnswers`.
      // We mark which path we're on so the rest of the handler knows.
      (body as Record<string, unknown>).__effectiveQuestionIds = effectiveQuestionIds;
      (body as Record<string, unknown>).__derivedAnswers = derivedAnswers;
    } else {
      const fetched = await db.quizQuestion.findMany({
        where: { id: { in: questionIds }, published: true },
        select: {
          id: true,
          categoryId: true,
          correctOptionIndex: true,
          options: true,
        },
      });
      for (const q of fetched) questions.push(q);
    }

    // Verify all submitted question IDs exist and are published.
    // For daily: we just resolved these server-side, so they MUST all be present.
    // For category: the client sent the list, so we check for any that didn't match.
    const expectedLength = type === 'daily' ? (effectiveQuestionIds as string[]).length : questionIds.length;
    if (questions.length !== expectedLength) {
      return NextResponse.json(
        { error: 'One or more questions are invalid or unpublished.' },
        { status: 400 },
      );
    }

    // For category quizzes, verify all questions belong to the claimed category.
    if (type === 'category') {
      const wrongCategory = questions.find((q) => q.categoryId !== refId);
      if (wrongCategory) {
        return NextResponse.json(
          { error: 'Question set does not match the selected category.' },
          { status: 400 },
        );
      }
    }

    // ── Pick the canonical questionIds + answers for the rest of the handler ──
    // For daily: use the server-resolved list + the derived answers (in server order).
    // For category: use the client's list as-is.
    const finalQuestionIds: string[] = effectiveQuestionIds;
    type FinalAnswer = { questionId: string; selectedOptionIndex: number | null; timeTakenSeconds: number };
    const finalAnswers: FinalAnswer[] = type === 'daily'
      ? ((body as Record<string, unknown>).__derivedAnswers as FinalAnswer[])
      : (answers as FinalAnswer[]);

    // Build a lookup: questionId → correctOptionIndex
    const correctMap = new Map<string, number>();
    for (const q of questions) {
      correctMap.set(q.id, q.correctOptionIndex);
    }

    // ── Score each answer server-side ──
    const gradedAnswers: Array<{
      questionId: string;
      selectedOptionIndex: number | null;
      correctOptionIndex: number;
      correct: boolean;
      points: number;
      timeTakenSeconds: number;
    }> = [];

    let totalPoints = 0;
    let correctCount = 0;

    for (let i = 0; i < finalQuestionIds.length; i++) {
      const qid = finalQuestionIds[i];
      const submitted = finalAnswers[i];
      const correctIdx = correctMap.get(qid);
      if (correctIdx === undefined) {
        // Shouldn't happen — we already validated. Defensive.
        return NextResponse.json({ error: 'Internal scoring error.' }, { status: 500 });
      }

      // Validate submitted.selectedOptionIndex
      let submittedIdx: number | null = null;
      if (
        submitted &&
        typeof submitted.selectedOptionIndex === 'number' &&
        Number.isInteger(submitted.selectedOptionIndex) &&
        submitted.selectedOptionIndex >= 0 &&
        submitted.selectedOptionIndex < 4
      ) {
        submittedIdx = submitted.selectedOptionIndex;
      }

      const isCorrect = submittedIdx !== null && submittedIdx === correctIdx;
      const points = isCorrect ? 100 : 0;
      if (isCorrect) correctCount++;
      totalPoints += points;

      gradedAnswers.push({
        questionId: qid,
        selectedOptionIndex: submittedIdx,
        correctOptionIndex: correctIdx,
        correct: isCorrect,
        points,
        timeTakenSeconds: typeof submitted?.timeTakenSeconds === 'number' ? submitted.timeTakenSeconds : 0,
      });
    }

    // ── Persist the attempt ──
    const attempt = await db.quizAttempt.create({
      data: {
        userId: currentUser.id,
        type,
        refId,
        questionIds: JSON.stringify(finalQuestionIds),
        answers: JSON.stringify(gradedAnswers),
        totalPoints,
        correctCount,
        totalQuestions: finalQuestionIds.length,
        startedAt: startedDate,
        finishedAt: new Date(),
      },
    });

    // ── If this was a daily quiz, update the DailyQuizCompletion lock
    // with the real attempt ID (so we can trace which attempt locked it). ──
    if (type === 'daily') {
      await db.dailyQuizCompletion.updateMany({
        where: { userId: currentUser.id, date: refId, attemptId: 'pending' },
        data: { attemptId: attempt.id },
      }).catch(() => {
        // Non-fatal — the lock itself already prevents duplicates.
      });
    }

    // ── Award any newly-earned achievements ──
    const newlyAwarded = await evaluateAndAwardAchievements({
      id: attempt.id,
      userId: currentUser.id,
      type,
      refId,
      totalPoints,
      correctCount,
      totalQuestions: finalQuestionIds.length,
      finishedAt: attempt.finishedAt,
    });

    // ── Evaluate and award Desily Badges ──
    // (separate from the older QuizAchievement system above; both run
    // idempotently — the unique constraint prevents duplicates.)
    const newlyAwardedBadges = await evaluateAndAwardBadges({
      type: 'quiz-attempt',
      attemptId: attempt.id,
    });

    // ── Return the graded attempt (now with correctOptionIndex revealed) ──
    // Re-fetch the question texts so the client can show the review screen
    // without making a second request.
    const fullQuestions = await db.quizQuestion.findMany({
      where: { id: { in: finalQuestionIds } },
      select: {
        id: true,
        text: true,
        translations: true,
        options: true,
        explanation: true,
        explanationTranslations: true,
        source: true,
      },
    });
    const qMap = new Map(fullQuestions.map((q) => [q.id, q]));

    return NextResponse.json(
      {
        attempt: {
          id: attempt.id,
          type,
          refId,
          totalPoints,
          correctCount,
          totalQuestions: finalQuestionIds.length,
          startedAt: attempt.startedAt.toISOString(),
          finishedAt: attempt.finishedAt.toISOString(),
          answers: gradedAnswers,
        },
        questions: finalQuestionIds.map((qid) => {
          const q = qMap.get(qid);
          if (!q) return null;
          return {
            id: q.id,
            text: q.text,
            translations: safeParse(q.translations, {}),
            options: safeParse(q.options, []),
            explanation: q.explanation,
            explanationTranslations: safeParse(q.explanationTranslations, {}),
            source: q.source,
          };
        }).filter(Boolean),
        newlyAwardedAchievements: newlyAwarded,
        newlyAwardedBadges,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('Error creating quiz attempt:', e);
    return NextResponse.json({ error: 'Failed to submit quiz.' }, { status: 500 });
  }
}

// Stable string hash — mirrors /api/quiz/daily's hashStr so the daily-attempt
// fallback can re-derive the same question IDs server-side.
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
