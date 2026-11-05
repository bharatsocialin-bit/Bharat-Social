import { db } from '@/lib/db';

/**
 * Bible reading streak helpers — shared by the chapter fetch route and
 * the streak API.
 *
 * Streak rules:
 *   • A "reading day" = the user opened any Bible chapter that day.
 *   • Streak increments by 1 each consecutive day the user reads.
 *   • If the user misses a day, the streak resets to 0 (and a new read
 *     starts a fresh streak of 1).
 *   • "Today" is computed in UTC midnight to keep it deterministic across
 *     timezones. (Refinement: per-user timezone could be added later.)
 */

/** Returns a Date set to midnight UTC of the given date. */
export function midnightUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Returns the difference in whole days between two midnight-UTC dates. */
export function dayDiff(a: Date, b: Date): number {
  const ms = midnightUTC(a).getTime() - midnightUTC(b).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/**
 * Record that the user read today. Idempotent — if the user already has a
 * row for today, no change. Updates the streak counter:
 *   • If lastReadDate was today → no change.
 *   • If lastReadDate was yesterday → streak += 1.
 *   • If lastReadDate was >1 day ago (or null) → streak = 1 (new streak).
 * Also bumps longestStreak + totalReadDays.
 *
 * Never throws — streak tracking is best-effort.
 */
export async function recordReadingDay(userId: string): Promise<void> {
  const today = midnightUTC();

  // Insert the day record (idempotent via unique constraint).
  try {
    await db.bibleReadingDay.upsert({
      where: { userId_date: { userId, date: today } },
      update: {},
      create: { userId, date: today },
    });
  } catch {
    // Race condition with a concurrent request — fine.
  }

  // Update the streak row.
  const existing = await db.bibleReadingStreak.findUnique({ where: { userId } });
  if (!existing) {
    await db.bibleReadingStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastReadDate: today,
        totalReadDays: 1,
      },
    });
    return;
  }

  // If already read today, no change.
  if (existing.lastReadDate && dayDiff(today, existing.lastReadDate) === 0) {
    return;
  }

  // Compute new streak.
  let newStreak = 1;
  if (existing.lastReadDate) {
    const diff = dayDiff(today, existing.lastReadDate);
    if (diff === 1) {
      // Consecutive day.
      newStreak = existing.currentStreak + 1;
    }
    // If diff > 1, streak resets to 1 (already the default above).
  }

  await db.bibleReadingStreak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(existing.longestStreak, newStreak),
      lastReadDate: today,
      totalReadDays: existing.totalReadDays + 1,
    },
  });
}

/**
 * Get the user's current streak state. Returns a default shape if the user
 * has never read.
 */
export async function getStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  totalReadDays: number;
  readToday: boolean;
  lastReadDate: string | null;
}> {
  const s = await db.bibleReadingStreak.findUnique({ where: { userId } });
  const today = midnightUTC();
  const readToday = !!s?.lastReadDate && dayDiff(today, s.lastReadDate) === 0;
  return {
    currentStreak: s?.currentStreak ?? 0,
    longestStreak: s?.longestStreak ?? 0,
    totalReadDays: s?.totalReadDays ?? 0,
    readToday,
    lastReadDate: s?.lastReadDate ? s.lastReadDate.toISOString() : null,
  };
}
