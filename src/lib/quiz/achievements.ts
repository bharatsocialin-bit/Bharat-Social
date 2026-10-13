import { db } from '@/lib/db';
import { computeStreak, istDateFromJsDate } from '@/lib/quiz/ist';

// ── Achievement awarder ─────────────────────────────────────────────────────
//
// Given a user ID + the just-completed attempt, evaluate ALL achievement
// criteria server-side and award any newly-earned badges. Idempotent —
// existing awards are not duplicated (enforced by the unique constraint
// [userId, achievementId] on UserAchievement).

interface JustFinishedAttempt {
  id: string;
  userId: string;
  type: string; // 'category' | 'daily'
  refId: string; // categoryId or YYYY-MM-DD
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  finishedAt: Date;
}

interface AwardableAchievement {
  slug: string;
  criteriaType: string;
  criteriaValue: number | null;
}

/**
 * Evaluate and award any newly-earned achievements after a quiz attempt.
 * Returns the list of newly-awarded achievement slugs.
 */
export async function evaluateAndAwardAchievements(
  attempt: JustFinishedAttempt,
): Promise<string[]> {
  // Load all achievement definitions.
  const allAchievements = await db.quizAchievement.findMany();
  // Load the user's existing awards.
  const existingAwards = await db.userAchievement.findMany({
    where: { userId: attempt.userId },
    select: { achievement: { select: { slug: true } } },
  });
  const existingSlugs = new Set(existingAwards.map((a) => a.achievement.slug));

  const newlyAwarded: string[] = [];

  for (const ach of allAchievements) {
    if (existingSlugs.has(ach.slug)) continue;
    const earned = await isAchievementEarned(ach, attempt);
    if (earned) {
      await db.userAchievement.create({
        data: {
          userId: attempt.userId,
          achievementId: ach.id,
        },
      }).catch(() => {
        // Race condition: another concurrent attempt just awarded this.
        // The unique constraint will reject — we just skip.
      });
      newlyAwarded.push(ach.slug);
    }
  }

  return newlyAwarded;
}

async function isAchievementEarned(
  ach: AwardableAchievement,
  attempt: JustFinishedAttempt,
): Promise<boolean> {
  switch (ach.criteriaType) {
    case 'first-quiz': {
      // Awarded when the user completes their FIRST quiz. Since this
      // function is called AFTER the attempt was inserted, we count
      // attempts including the current one.
      const count = await db.quizAttempt.count({ where: { userId: attempt.userId } });
      return count >= 1;
    }
    case 'perfect-score': {
      return attempt.totalQuestions > 0 && attempt.correctCount === attempt.totalQuestions;
    }
    case 'seven-day-streak': {
      const target = ach.criteriaValue ?? 7;
      // Get all attempt dates (IST) for the user.
      const attempts = await db.quizAttempt.findMany({
        where: { userId: attempt.userId },
        select: { finishedAt: true },
      });
      const dates = attempts.map((a) => istDateFromJsDate(a.finishedAt));
      const streak = computeStreak(dates);
      return streak >= target;
    }
    case 'category-expert': {
      // 2 perfect scores in the same category.
      const target = ach.criteriaValue ?? 2;
      if (attempt.type !== 'category') return false;
      if (attempt.totalQuestions === 0 || attempt.correctCount !== attempt.totalQuestions) return false;
      const perfectCount = await db.quizAttempt.count({
        where: {
          userId: attempt.userId,
          type: 'category',
          refId: attempt.refId,
          totalQuestions: { gt: 0 },
        },
      });
      // We can't easily filter "correctCount === totalQuestions" in prisma
      // (it requires a computed column). Fetch them and count client-side.
      const attemptsInCat = await db.quizAttempt.findMany({
        where: {
          userId: attempt.userId,
          type: 'category',
          refId: attempt.refId,
        },
        select: { correctCount: true, totalQuestions: true },
      });
      const perfects = attemptsInCat.filter((a) => a.totalQuestions > 0 && a.correctCount === a.totalQuestions).length;
      return perfects >= target;
    }
    case 'daily-player': {
      // Complete at least one daily challenge.
      const dailyCount = await db.quizAttempt.count({
        where: { userId: attempt.userId, type: 'daily' },
      });
      return dailyCount >= 1;
    }
    case 'ten-quizzes': {
      const target = ach.criteriaValue ?? 10;
      const count = await db.quizAttempt.count({ where: { userId: attempt.userId } });
      return count >= target;
    }
    case 'five-hundred-points': {
      const target = ach.criteriaValue ?? 500;
      const attempts = await db.quizAttempt.findMany({
        where: { userId: attempt.userId },
        select: { totalPoints: true },
      });
      const total = attempts.reduce((sum, a) => sum + a.totalPoints, 0);
      return total >= target;
    }
    default:
      return false;
  }
}

/** Convert a JS Date (UTC) to a YYYY-MM-DD string in IST. */
// Re-exported from ist.ts so the badge awarder can use a single source of truth.
void istDateFromJsDate;
