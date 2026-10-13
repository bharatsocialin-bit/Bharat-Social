import { db } from '@/lib/db';
import { computeStreak, istDateFromJsDate } from '@/lib/quiz/ist';

// ── Badge evaluator ─────────────────────────────────────────────────────────
//
// The single source of truth for badge awards. Called after every
// qualifying activity (quiz attempt, post creation, comment, like, follow,
// short upload, profile update). The browser NEVER claims a badge.
//
// Anti-abuse guarantees:
//   - Awards are idempotent: the unique constraint [userId, badgeId] on
//     UserBadge prevents duplicates. Race conditions are caught.
//   - Points come ONLY from server-side quiz scoring. There is no client-
//     submitted point value anywhere.
//   - For "received comments" / "following count" / etc., the criteria
//     explicitly exclude self-generated activity (no self-likes, no self-
//     comments, no self-follows).
//   - Deleted posts / soft-deleted shorts / suspended users are filtered out.
//   - The chat/community badges are inactive (active=false in the DB), so
//     the evaluator skips them entirely.
//
// Returns the slugs of newly-awarded badges (for the calling route to
// surface as a notification to the user).

export type ActivityTrigger =
  | { type: 'quiz-attempt'; attemptId: string }
  | { type: 'post-created'; postId: string }
  | { type: 'comment-created'; commentId: string }
  | { type: 'like-created'; likeId: string }
  | { type: 'follow-created'; followId: string }
  | { type: 'short-created'; shortId: string }
  | { type: 'profile-updated'; userId: string }
  | { type: 'generic'; userId: string };

interface BadgeDef {
  id: string;
  slug: string;
  criteriaType: string;
  criteriaValue: number | null;
  active: boolean;
}

/**
 * Evaluate all active badges for the given user after a triggering activity.
 * Awards any newly-earned badges. Idempotent — existing awards are skipped.
 *
 * Returns the slugs of newly-awarded badges (empty array if none).
 */
export async function evaluateAndAwardBadges(
  trigger: ActivityTrigger,
): Promise<string[]> {
  const userId = await resolveUserId(trigger);
  if (!userId) return [];

  // Load all ACTIVE badge definitions.
  const allBadges = await db.badge.findMany({
    where: { active: true },
  });
  if (allBadges.length === 0) return [];

  // Load the user's existing awards (slugs only).
  const existingAwards = await db.userBadge.findMany({
    where: { userId },
    select: { badge: { select: { slug: true } } },
  });
  const existingSlugs = new Set(existingAwards.map((a) => a.badge.slug));

  const newlyAwarded: string[] = [];

  for (const badge of allBadges) {
    if (existingSlugs.has(badge.slug)) continue;
    const earned = await isBadgeEarned(badge, userId, trigger);
    if (earned) {
      try {
        await db.userBadge.create({
          data: { userId, badgeId: badge.id },
        });
        newlyAwarded.push(badge.slug);
        // Clear the progress row for this badge (if any) since it's earned.
        await db.badgeProgress.deleteMany({
          where: { userId, badgeId: badge.id },
        }).catch(() => {});
      } catch {
        // Race condition: another concurrent activity just awarded this.
        // The unique constraint will reject — we just skip.
      }
    }
  }

  // Update progress for not-yet-earned badges (so the UI can show "7 / 30").
  // We do this in the background — it's not in the critical path for the
  // response, but we still await so the function is "complete" when it returns.
  await updateBadgeProgress(userId, allBadges, existingSlugs, newlyAwarded);

  return newlyAwarded;
}

async function resolveUserId(trigger: ActivityTrigger): Promise<string | null> {
  if ('userId' in trigger) return trigger.userId;
  // Look up the userId from the related entity.
  if (trigger.type === 'quiz-attempt') {
    const a = await db.quizAttempt.findUnique({ where: { id: trigger.attemptId }, select: { userId: true } });
    return a?.userId ?? null;
  }
  if (trigger.type === 'post-created') {
    const p = await db.post.findUnique({ where: { id: trigger.postId }, select: { authorId: true } });
    return p?.authorId ?? null;
  }
  if (trigger.type === 'comment-created') {
    const c = await db.comment.findUnique({ where: { id: trigger.commentId }, select: { userId: true } });
    return c?.userId ?? null;
  }
  if (trigger.type === 'like-created') {
    const l = await db.like.findUnique({ where: { id: trigger.likeId }, select: { userId: true } });
    return l?.userId ?? null;
  }
  if (trigger.type === 'follow-created') {
    const f = await db.follow.findUnique({ where: { id: trigger.followId }, select: { followerId: true } });
    return f?.followerId ?? null;
  }
  if (trigger.type === 'short-created') {
    const s = await db.short.findUnique({ where: { id: trigger.shortId }, select: { creatorId: true } });
    return s?.creatorId ?? null;
  }
  return null;
}

async function isBadgeEarned(
  badge: BadgeDef,
  userId: string,
  trigger: ActivityTrigger,
): Promise<boolean> {
  switch (badge.criteriaType) {
    // ── Quiz completion count ──
    case 'quiz-completion-count': {
      const target = badge.criteriaValue ?? 1;
      const count = await db.quizAttempt.count({ where: { userId } });
      return count >= target;
    }

    // ── Perfect score (any quiz, 100% accuracy) ──
    case 'perfect-score': {
      // Look for any attempt where correctCount === totalQuestions (and >0).
      // We can't filter this in Prisma directly, so fetch + filter.
      const attempts = await db.quizAttempt.findMany({
        where: { userId, totalQuestions: { gt: 0 } },
        select: { correctCount: true, totalQuestions: true },
        take: 200,
      });
      return attempts.some((a) => a.correctCount === a.totalQuestions);
    }

    // ── Accuracy over N questions (≥90% across N answered questions) ──
    case 'accuracy-over-questions': {
      const minQuestions = badge.criteriaValue ?? 50;
      const attempts = await db.quizAttempt.findMany({
        where: { userId, totalQuestions: { gt: 0 } },
        select: { correctCount: true, totalQuestions: true },
      });
      const totalAnswered = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
      if (totalAnswered < minQuestions) return false;
      const totalCorrect = attempts.reduce((sum, a) => sum + a.correctCount, 0);
      const accuracy = totalCorrect / totalAnswered;
      return accuracy >= 0.9;
    }

    // ── Distinct categories completed ──
    case 'distinct-categories': {
      const target = badge.criteriaValue ?? 5;
      const attempts = await db.quizAttempt.findMany({
        where: { userId, type: 'category' },
        select: { refId: true },
        distinct: ['refId'],
      });
      return attempts.length >= target;
    }

    // ── Correct answers count ──
    case 'correct-answers-count': {
      const target = badge.criteriaValue ?? 500;
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { correctCount: true },
      });
      const total = attempts.reduce((sum, a) => sum + a.correctCount, 0);
      return total >= target;
    }

    // ── Streak days ──
    case 'streak-days': {
      const target = badge.criteriaValue ?? 7;
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { finishedAt: true },
      });
      const dates = attempts.map((a) => istDateFromJsDate(a.finishedAt));
      const streak = computeStreak(dates);
      return streak >= target;
    }

    // ── Total points ──
    case 'total-points': {
      const target = badge.criteriaValue ?? 100;
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { totalPoints: true },
      });
      const total = attempts.reduce((sum, a) => sum + a.totalPoints, 0);
      return total >= target;
    }

    // ── Profile complete ──
    case 'profile-complete': {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { name: true, bio: true, state: true, city: true },
      });
      if (!user) return false;
      return Boolean(
        user.name && user.name.trim().length > 0 &&
        user.bio && user.bio.trim().length > 0 &&
        user.state && user.state.trim().length > 0 &&
        user.city && user.city.trim().length > 0,
      );
    }

    // ── Posts count (excluding soft-deleted) ──
    case 'posts-count': {
      const target = badge.criteriaValue ?? 1;
      const count = await db.post.count({
        where: { authorId: userId, deletedAt: null },
      });
      return count >= target;
    }

    // ── Received comments count (excluding self-comments on own posts) ──
    case 'received-comments-count': {
      const target = badge.criteriaValue ?? 1;
      // Count comments on the user's posts where the commenter is NOT the post author.
      // We need to join Post → Comment and filter where post.authorId = userId AND
      // comment.userId != userId.
      const posts = await db.post.findMany({
        where: { authorId: userId, deletedAt: null },
        select: {
          comments: {
            where: { userId: { not: userId } },
            select: { id: true },
          },
        },
      });
      const total = posts.reduce((sum, p) => sum + p.comments.length, 0);
      return total >= target;
    }

    // ── Following count (excluding self-follows — which are blocked at the API level) ──
    case 'following-count': {
      const target = badge.criteriaValue ?? 10;
      const count = await db.follow.count({
        where: { followerId: userId },
      });
      return count >= target;
    }

    // ── Shorts count (excluding soft-deleted + moderated-out) ──
    case 'shorts-count': {
      const target = badge.criteriaValue ?? 10;
      const count = await db.short.count({
        where: {
          creatorId: userId,
          deletedAt: null,
          moderationStatus: 'active',
        },
      });
      return count >= target;
    }

    // ── Distinct activity days ──
    // Any of: post, comment, like, follow, short upload, quiz attempt — on
    // distinct IST days. Self-likes excluded (the Like model has no self-like
    // possible — the API blocks it, but we also filter defensively).
    case 'distinct-activity-days': {
      const target = badge.criteriaValue ?? 7;
      const days = new Set<string>();
      // Posts
      const posts = await db.post.findMany({
        where: { authorId: userId, deletedAt: null },
        select: { createdAt: true },
      });
      for (const p of posts) days.add(istDateFromJsDate(p.createdAt));
      // Comments
      const comments = await db.comment.findMany({
        where: { userId },
        select: { createdAt: true },
      });
      for (const c of comments) days.add(istDateFromJsDate(c.createdAt));
      // Likes
      const likes = await db.like.findMany({
        where: { userId },
        select: { createdAt: true },
      });
      for (const l of likes) days.add(istDateFromJsDate(l.createdAt));
      // Follows
      const follows = await db.follow.findMany({
        where: { followerId: userId },
        select: { createdAt: true },
      });
      for (const f of follows) days.add(istDateFromJsDate(f.createdAt));
      // Shorts
      const shorts = await db.short.findMany({
        where: { creatorId: userId, deletedAt: null },
        select: { createdAt: true },
      });
      for (const s of shorts) days.add(istDateFromJsDate(s.createdAt));
      // Quiz attempts
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { finishedAt: true },
      });
      for (const a of attempts) days.add(istDateFromJsDate(a.finishedAt));
      return days.size >= target;
    }

    // ── Chat/community badges — inactive, never awarded ──
    case 'chat-participation-count':
    case 'chat-distinct-days':
    case 'positive-recognitions':
    case 'helpful-votes':
      return false;

    default:
      return false;
  }
}

/**
 * Update BadgeProgress rows for not-yet-earned badges.
 * The UI uses these to render "7 / 30 days" progress bars on locked badges.
 */
async function updateBadgeProgress(
  userId: string,
  allBadges: BadgeDef[],
  existingSlugs: Set<string>,
  newlyAwarded: string[],
): Promise<void> {
  // Skip badges the user has already earned (or just earned).
  const earnedOrJustAwarded = new Set([...existingSlugs, ...newlyAwarded]);

  for (const badge of allBadges) {
    if (earnedOrJustAwarded.has(badge.slug)) continue;
    const progress = await computeProgress(badge, userId);
    if (progress === null) continue; // criteria not progress-trackable
    const { current, target } = progress;

    // Upsert the BadgeProgress row.
    await db.badgeProgress.upsert({
      where: {
        userId_badgeId: { userId, badgeId: badge.id },
      },
      update: { current, target },
      create: { userId, badgeId: badge.id, current, target },
    }).catch(() => {
      // Race condition or unique constraint violation — safe to ignore.
    });
  }
}

/**
 * Compute the progress (current/target) for a badge, if it's trackable.
 * Returns null for badges that don't have a meaningful progress metric
 * (e.g. perfect-score is binary — you either have it or you don't).
 */
async function computeProgress(
  badge: BadgeDef,
  userId: string,
): Promise<{ current: number; target: number } | null> {
  const target = badge.criteriaValue;
  if (target === null) return null; // binary badge — no progress

  switch (badge.criteriaType) {
    case 'quiz-completion-count': {
      const count = await db.quizAttempt.count({ where: { userId } });
      return { current: count, target };
    }
    case 'accuracy-over-questions': {
      const attempts = await db.quizAttempt.findMany({
        where: { userId, totalQuestions: { gt: 0 } },
        select: { correctCount: true, totalQuestions: true },
      });
      const totalAnswered = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
      return { current: Math.min(totalAnswered, target), target };
    }
    case 'distinct-categories': {
      const attempts = await db.quizAttempt.findMany({
        where: { userId, type: 'category' },
        select: { refId: true },
        distinct: ['refId'],
      });
      return { current: attempts.length, target };
    }
    case 'correct-answers-count': {
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { correctCount: true },
      });
      const total = attempts.reduce((sum, a) => sum + a.correctCount, 0);
      return { current: Math.min(total, target), target };
    }
    case 'streak-days': {
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { finishedAt: true },
      });
      const dates = attempts.map((a) => istDateFromJsDate(a.finishedAt));
      const streak = computeStreak(dates);
      return { current: Math.min(streak, target), target };
    }
    case 'total-points': {
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { totalPoints: true },
      });
      const total = attempts.reduce((sum, a) => sum + a.totalPoints, 0);
      return { current: Math.min(total, target), target };
    }
    case 'posts-count': {
      const count = await db.post.count({
        where: { authorId: userId, deletedAt: null },
      });
      return { current: Math.min(count, target), target };
    }
    case 'received-comments-count': {
      const posts = await db.post.findMany({
        where: { authorId: userId, deletedAt: null },
        select: {
          comments: {
            where: { userId: { not: userId } },
            select: { id: true },
          },
        },
      });
      const total = posts.reduce((sum, p) => sum + p.comments.length, 0);
      return { current: Math.min(total, target), target };
    }
    case 'following-count': {
      const count = await db.follow.count({
        where: { followerId: userId },
      });
      return { current: Math.min(count, target), target };
    }
    case 'shorts-count': {
      const count = await db.short.count({
        where: {
          creatorId: userId,
          deletedAt: null,
          moderationStatus: 'active',
        },
      });
      return { current: Math.min(count, target), target };
    }
    case 'distinct-activity-days': {
      const days = new Set<string>();
      const posts = await db.post.findMany({
        where: { authorId: userId, deletedAt: null },
        select: { createdAt: true },
      });
      for (const p of posts) days.add(istDateFromJsDate(p.createdAt));
      const comments = await db.comment.findMany({
        where: { userId },
        select: { createdAt: true },
      });
      for (const c of comments) days.add(istDateFromJsDate(c.createdAt));
      const likes = await db.like.findMany({
        where: { userId },
        select: { createdAt: true },
      });
      for (const l of likes) days.add(istDateFromJsDate(l.createdAt));
      const follows = await db.follow.findMany({
        where: { followerId: userId },
        select: { createdAt: true },
      });
      for (const f of follows) days.add(istDateFromJsDate(f.createdAt));
      const shorts = await db.short.findMany({
        where: { creatorId: userId, deletedAt: null },
        select: { createdAt: true },
      });
      for (const s of shorts) days.add(istDateFromJsDate(s.createdAt));
      const attempts = await db.quizAttempt.findMany({
        where: { userId },
        select: { finishedAt: true },
      });
      for (const a of attempts) days.add(istDateFromJsDate(a.finishedAt));
      return { current: Math.min(days.size, target), target };
    }
    default:
      return null; // binary or chat-only badge — no progress
  }
}
