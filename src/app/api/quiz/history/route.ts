import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ── GET /api/quiz/history ───────────────────────────────────────────────────
// Returns the current user's quiz history, including:
//   - All completed attempts (most recent first)
//   - Their total points
//   - Best score per category
//
// Requires authentication — anonymous users get a 401.
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attempts = await db.quizAttempt.findMany({
      where: { userId: currentUser.id },
      orderBy: { finishedAt: 'desc' },
      take: 100,
    });

    // Compute best score per category.
    const bestByCategory = new Map<string, { totalPoints: number; correctCount: number; totalQuestions: number; attempts: number }>();
    for (const a of attempts) {
      if (a.type !== 'category') continue;
      const existing = bestByCategory.get(a.refId);
      if (!existing || a.totalPoints > existing.totalPoints) {
        bestByCategory.set(a.refId, {
          totalPoints: a.totalPoints,
          correctCount: a.correctCount,
          totalQuestions: a.totalQuestions,
          attempts: (existing?.attempts ?? 0) + 1,
        });
      } else {
        existing.attempts++;
      }
    }

    const totalPoints = attempts.reduce((sum, a) => sum + a.totalPoints, 0);

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
      })),
      stats: {
        totalAttempts: attempts.length,
        totalPoints,
        bestByCategory: Array.from(bestByCategory.entries()).map(([categoryId, b]) => ({
          categoryId,
          ...b,
        })),
      },
    });
  } catch (e) {
    console.error('Error fetching quiz history:', e);
    return NextResponse.json({ error: 'Failed to fetch history.' }, { status: 500 });
  }
}
