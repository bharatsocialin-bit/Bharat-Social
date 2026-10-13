// IST (India Standard Time, UTC+5:30) date helpers for the India Quiz.
//
// All daily challenge logic uses IST — a quiz that becomes available at
// midnight IST is the same quiz for everyone in India, regardless of where
// the server is hosted.
//
// All functions return local-format strings (YYYY-MM-DD) representing IST
// calendar dates. We deliberately avoid using `new Date().toLocaleDateString`
// because it depends on the host's timezone.

const IST_OFFSET_MINUTES = 5 * 60 + 30; // 330 minutes ahead of UTC

/** Returns the current IST timestamp as a Date object. */
export function istNow(): Date {
  const now = new Date();
  // Compute IST by adding the offset to UTC, then construct a new Date
  // from the resulting UTC milliseconds. The new Date object's `.getUTC*`
  // methods will return IST values, but its `.get*` methods will still
  // return host-local values. We always use the formatted YYYY-MM-DD
  // helper below, never the raw getFullYear etc.
  return new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
}

/** Returns the current IST date as a YYYY-MM-DD string. */
export function istTodayDate(): string {
  return istNow().toISOString().slice(0, 10);
}

/**
 * Returns the IST date that is `daysAgo` days before today.
 * @param daysAgo 0 = today, 1 = yesterday, etc.
 */
export function istDateAgo(daysAgo: number): string {
  const t = istNow().getTime() - daysAgo * 24 * 60 * 60_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Convert a JS Date (UTC) to a YYYY-MM-DD string representing the IST
 * calendar date the moment falls in. Used to bucket quiz attempts by IST day.
 *
 * Example: a Date at 2024-10-10T18:00:00Z is 2024-10-11 00:30 in IST,
 * so this function returns "2024-10-11".
 */
export function istDateFromJsDate(d: Date): string {
  // IST = UTC + 5:30. Add the offset to the UTC ms, then slice the date.
  const istMs = d.getTime() + IST_OFFSET_MINUTES * 60_000;
  return new Date(istMs).toISOString().slice(0, 10);
}

/**
 * Compute the user's current streak based on their attempt history.
 *
 * A "streak" means: the user has at least one quiz attempt whose IST date
 * is today OR (the user's most recent attempt was yesterday AND they have
 * a contiguous run of days going back from there).
 *
 * We count days on which the user finished AT LEAST ONE quiz attempt
 * (any type). The streak is the number of consecutive days ending today
 * or yesterday.
 *
 * @param attemptDates array of YYYY-MM-DD strings (in IST) when the user finished attempts
 */
export function computeStreak(attemptDates: string[]): number {
  if (attemptDates.length === 0) return 0;
  const set = new Set(attemptDates);
  let streak = 0;
  // If user played today, start from today. Otherwise, if they played
  // yesterday, start from yesterday (so the streak doesn't reset just
  // because the new IST day just rolled over and they haven't played yet
  // today). If neither, streak is 0.
  let cursor = istTodayDate();
  if (!set.has(cursor)) {
    cursor = istDateAgo(1);
    if (!set.has(cursor)) {
      return 0;
    }
  }
  // Walk backwards day-by-day, counting consecutive days with attempts.
  while (set.has(cursor)) {
    streak++;
    const t = new Date(cursor + 'T00:00:00Z').getTime() - 24 * 60 * 60_000;
    cursor = new Date(t).toISOString().slice(0, 10);
  }
  return streak;
}
