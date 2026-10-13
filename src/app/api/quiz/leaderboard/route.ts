import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { istTodayDate, istDateAgo } from '@/lib/quiz/ist';

// ── GET /api/quiz/leaderboard?period=daily|weekly|all-time ──────────────────
// Returns a server-authoritative leaderboard.
//
// Periods:
//   - daily:    attempts finished today (IST)
//   - weekly:   attempts finished in the last 7 days (IST)
//   - all-time: all attempts ever
//
// We aggregate SUM(totalPoints), COUNT(*) as quizzesPlayed, MAX(accuracy)
// per user, then join with User for display info.
//
// LIMIT 50 entries. The current user is always included (even if outside
// the top 50) so they can see their own rank.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all-time';
    if (!['daily', 'weekly', 'all-time'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();

    // Build the date filter.
    let since: Date | null = null;
    if (period === 'daily') since = new Date(istTodayDate() + 'T00:00:00Z');
    else if (period === 'weekly') since = new Date(istDateAgo(7) + 'T00:00:00Z');

    const where = since ? { finishedAt: { gte: since } } : {};

    // Aggregate by user.
    const rows = await db.quizAttempt.groupBy({
      by: ['userId'],
      where,
      _sum: { totalPoints: true },
      _count: { id: true },
      _max: { totalPoints: true },
      orderBy: { _sum: { totalPoints: 'desc' } },
      take: 50,
    });

    if (rows.length === 0) {
      return NextResponse.json({
        period,
        leaderboard: [],
        currentUserRank: currentUser ? null : undefined,
      });
    }

    // Fetch the users for display.
    const userIds = rows.map((r) => r.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        username: true,
        avatarGradient: true,
        initials: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // For best accuracy, we need to compute MAX(correctCount / totalQuestions).
    // Prisma doesn't support that as a single aggregation, so we fetch the
    // raw attempts per user (limited to the period) and compute client-side.
    // For a small user base this is fine; for production we'd add a
    // bestAccuracy column to the User table.
    const attemptsForAccuracy = await db.quizAttempt.findMany({
      where: { ...where, userId: { in: userIds } },
      select: { userId: true, correctCount: true, totalQuestions: true },
    });
    const bestAccuracyByUser = new Map<string, number>();
    for (const a of attemptsForAccuracy) {
      if (a.totalQuestions === 0) continue;
      const acc = a.correctCount / a.totalQuestions;
      const cur = bestAccuracyByUser.get(a.userId) ?? 0;
      if (acc > cur) bestAccuracyByUser.set(a.userId, acc);
    }

    const leaderboard = rows.map((r, idx) => {
      const u = userMap.get(r.userId);
      return {
        rank: idx + 1,
        userId: r.userId,
        name: u?.name || u?.username || 'Unknown',
        username: u?.username || '',
        initials: u?.initials || '?',
        avatarGradient: u?.avatarGradient || 'from-slate-500 to-slate-600',
        totalPoints: r._sum.totalPoints || 0,
        quizzesPlayed: r._count.id,
        bestAccuracy: bestAccuracyByUser.get(r.userId) ?? 0,
      };
    });

    // Find the current user's rank — they may be outside the top 50.
    let currentUserRank: { rank: number; totalPoints: number; quizzesPlayed: number } | null = null;
    if (currentUser) {
      const existing = leaderboard.find((e) => e.userId === currentUser.id);
      if (existing) {
        // User is in the top 50 — return their rank.
        currentUserRank = {
          rank: existing.rank,
          totalPoints: existing.totalPoints,
          quizzesPlayed: existing.quizzesPlayed,
        };
      } else {
        // User is outside the top 50 — compute their totals across the
        // same period and count how many users rank above them.
        const userAttempts = await db.quizAttempt.findMany({
          where: { ...where, userId: currentUser.id },
          select: { totalPoints: true },
        });
        const userTotal = userAttempts.reduce((sum, a) => sum + a.totalPoints, 0);
        if (userTotal > 0) {
          const allTotals = await db.quizAttempt.groupBy({
            by: ['userId'],
            where,
            _sum: { totalPoints: true },
          });
          const ranked = allTotals
            .map((r) => ({ userId: r.userId, total: r._sum.totalPoints || 0 }))
            .sort((a, b) => b.total - a.total);
          const myIdx = ranked.findIndex((r) => r.userId === currentUser.id);
          currentUserRank = {
            rank: myIdx + 1,
            totalPoints: userTotal,
            quizzesPlayed: userAttempts.length,
          };
        }
      }
    }

    return NextResponse.json({
      period,
      leaderboard,
      currentUserRank: currentUser ? currentUserRank : undefined,
    });
  } catch (e) {
    console.error('Error fetching leaderboard:', e);
    return NextResponse.json({ error: 'Failed to fetch leaderboard.' }, { status: 500 });
  }
}
