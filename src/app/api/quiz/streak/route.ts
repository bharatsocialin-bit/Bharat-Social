import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { computeStreak, istDateFromJsDate } from '@/lib/quiz/ist';

// ── GET /api/quiz/streak ────────────────────────────────────────────────────
// Returns the current user's streak info:
//   - currentStreak: consecutive days (ending today or yesterday) with ≥1 attempt
//   - lastPlayedDate: IST date of the user's most recent attempt
//   - attemptsByDate: array of IST YYYY-MM-DD dates with at least one attempt (last 30 days)
//
// Requires authentication.
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attempts = await db.quizAttempt.findMany({
      where: { userId: currentUser.id },
      orderBy: { finishedAt: 'desc' },
      select: { finishedAt: true },
    });

    const dates = attempts.map((a) => istDateFromJsDate(a.finishedAt));
    const uniqueDates = Array.from(new Set(dates)).sort().reverse();
    const streak = computeStreak(uniqueDates);

    return NextResponse.json({
      currentStreak: streak,
      lastPlayedDate: uniqueDates[0] || null,
      attemptsByDate: uniqueDates.slice(0, 30),
    });
  } catch (e) {
    console.error('Error fetching streak:', e);
    return NextResponse.json({ error: 'Failed to fetch streak.' }, { status: 500 });
  }
}
