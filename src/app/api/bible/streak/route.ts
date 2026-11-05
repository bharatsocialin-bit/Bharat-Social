import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { getStreak, recordReadingDay } from '@/lib/bible/streak';

// ============================================================================
// GET  /api/bible/streak  — get current user's reading streak
// POST /api/bible/streak  — manually record a reading day (e.g. user reads
//                           a chapter via the reader and we want to ensure
//                           the day is counted even if the chapter fetch
//                           side-effect missed)
//
// Both require authentication. Anonymous users get 401.
// ============================================================================

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view your streak.' }, { status: 401 });
    }
    const streak = await getStreak(user.id);
    return NextResponse.json(streak);
  } catch (error) {
    console.error('Bible streak get error:', error);
    return NextResponse.json({ error: 'Failed to load streak.' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to track reading.' }, { status: 401 });
    }
    await recordReadingDay(user.id);
    const streak = await getStreak(user.id);
    return NextResponse.json(streak);
  } catch (error) {
    console.error('Bible streak record error:', error);
    return NextResponse.json({ error: 'Failed to record reading day.' }, { status: 500 });
  }
}
