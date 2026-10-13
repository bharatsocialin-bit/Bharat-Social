import type { DailyChallenge, QuizAchievement, QuizLeaderboardEntry } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — daily challenges, achievements, leaderboard.
//
// NOTE on daily challenges: the question set below is hand-curated and
// labelled by date. The demonstration prototype does NOT auto-generate
// new questions every day — when the configured date passes, the same
// demonstration set is shown for "today" until a real question bank
// is connected.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Daily challenges keyed by date (YYYY-MM-DD).
 *
 * In production this would come from a database table with one row per
 * date, generated server-side. For the demonstration prototype we ship
 * a small set covering the last few days and a stable "today" fallback.
 */
export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    date: '2026-10-09',
    title: 'Today’s Daily Challenge — A mix from across India',
    titleTranslations: {
      hi: 'आज की दैनिक चुनौती — पूरे भारत से मिश्रित',
      te: 'నేటి దైనిక సవాలు — భారతదేశం నుండి మిశ్రమం',
    },
    questionIds: ['q-gk-1', 'q-hist-1', 'q-sci-1', 'q-spt-1', 'q-cin-1'],
  },
  {
    date: '2026-10-08',
    title: 'Yesterday’s Daily Challenge',
    titleTranslations: {
      hi: 'कल की दैनिक चुनौती',
      te: 'నిన్నటి దైనిక సవాలు',
    },
    questionIds: ['q-gk-2', 'q-hist-2', 'q-sci-2', 'q-spt-2', 'q-cul-1'],
  },
  {
    date: '2026-10-07',
    title: 'Daily Challenge — 7 October',
    titleTranslations: {
      hi: 'दैनिक चुनौती — 7 अक्टूबर',
      te: 'దైనిక సవాలు — 7 అక్టోబర్',
    },
    questionIds: ['q-geo-1', 'q-hist-3', 'q-cin-2', 'q-spt-3', 'q-cul-2'],
  },
];

/** Get today's daily challenge in IST. Falls back to the latest available date. */
export function getTodayChallenge(): DailyChallenge {
  // Today's date in IST (UTC+5:30). We compute this on the client to avoid
  // SSR/hydration mismatches, but since the data set is fixed for the demo,
  // we just return the entry dated "today" or the most recent one before it.
  const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  // Try exact match first
  const exact = DAILY_CHALLENGES.find((c) => c.date === todayIso);
  if (exact) return exact;
  // Otherwise return the latest date we have that is <= today
  const sorted = [...DAILY_CHALLENGES].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0];
}

/** All achievements available in the quiz. */
export const QUIZ_ACHIEVEMENTS: QuizAchievement[] = [
  {
    id: 'ach-first-quiz',
    name: 'First Quiz',
    nameTranslations: {
      hi: 'पहला क्विज़',
      te: 'మొదటి క్విజ్',
    },
    description: 'Complete your very first quiz.',
    descriptionTranslations: {
      hi: 'अपना पहला क्विज़ पूरा करें।',
      te: 'మీ మొదటి క్విజ్ పూర్తి చేయండి.',
    },
    icon: 'sparkles',
    gradient: 'from-teal-500 to-emerald-600',
    criteria: { type: 'first-quiz' },
  },
  {
    id: 'ach-perfect',
    name: 'Perfect Score',
    nameTranslations: {
      hi: 'उत्तम स्कोर',
      te: 'సంపూర్ణ స్కోర్',
    },
    description: 'Answer every question correctly in a quiz.',
    descriptionTranslations: {
      hi: 'किसी क्विज़ में सभी प्रश्नों के सही उत्तर दें।',
      te: 'ఒక క్విజ్‌లో అన్ని ప్రశ్నలకు సరైన సమాధానాలు ఇవ్వండి.',
    },
    icon: 'award',
    gradient: 'from-amber-500 to-orange-600',
    criteria: { type: 'perfect-score' },
  },
  {
    id: 'ach-seven-day',
    name: 'Seven-Day Streak',
    nameTranslations: {
      hi: 'सात दिन की लय',
      te: 'ఏడు రోజుల స్ట్రీక్',
    },
    description: 'Play a quiz every day for seven consecutive days.',
    descriptionTranslations: {
      hi: 'लगातार सात दिनों तक हर दिन एक क्विज़ खेलें।',
      te: 'వరుసగా ఏడు రోజులు ప్రతిరోజూ ఒక క్విజ్ ఆడండి.',
    },
    icon: 'flame',
    gradient: 'from-rose-500 to-pink-600',
    criteria: { type: 'seven-day-streak' },
  },
  {
    id: 'ach-category-expert',
    name: 'Category Expert',
    nameTranslations: {
      hi: 'श्रेणी विशेषज्ञ',
      te: 'వర్గ నిపుణుడు',
    },
    description: 'Get a perfect score in the same category twice.',
    descriptionTranslations: {
      hi: 'एक ही श्रेणी में दो बार उत्तम स्कोर प्राप्त करें।',
      te: 'ఒకే వర్గంలో రెండుసార్లు సంపూర్ణ స్కోర్ సాధించండి.',
    },
    icon: 'graduation-cap',
    gradient: 'from-indigo-500 to-violet-600',
    criteria: { type: 'category-expert', minPerfectScores: 2 },
  },
  {
    id: 'ach-daily-player',
    name: 'Daily Player',
    nameTranslations: {
      hi: 'दैनिक खिलाड़ी',
      te: 'దైనిక ఆటగాడు',
    },
    description: 'Complete at least one Daily Challenge.',
    descriptionTranslations: {
      hi: 'कम से कम एक दैनिक चुनौती पूरी करें।',
      te: 'కనీసం ఒక దైనిక సవాలను పూర్తి చేయండి.',
    },
    icon: 'calendar-check',
    gradient: 'from-cyan-500 to-teal-600',
    criteria: { type: 'daily-player' },
  },
];

/**
 * Demonstration leaderboard — fictional users with sample scores.
 * In production this would be a server-side aggregation query.
 */
export const DEMO_LEADERBOARD: QuizLeaderboardEntry[] = [
  { userId: 'u-aarav', totalPoints: 1240, quizzesPlayed: 18, bestAccuracy: 0.94 },
  { userId: 'u-ananya', totalPoints: 980, quizzesPlayed: 14, bestAccuracy: 0.88 },
  { userId: 'u-karthik', totalPoints: 870, quizzesPlayed: 12, bestAccuracy: 0.91 },
  { userId: 'u-meera', totalPoints: 760, quizzesPlayed: 11, bestAccuracy: 0.85 },
  { userId: 'u-priya', totalPoints: 690, quizzesPlayed: 9, bestAccuracy: 0.82 },
  { userId: 'u-rohan', totalPoints: 540, quizzesPlayed: 8, bestAccuracy: 0.79 },
  { userId: 'u-sara', totalPoints: 420, quizzesPlayed: 7, bestAccuracy: 0.76 },
  { userId: 'u-arjun', totalPoints: 380, quizzesPlayed: 6, bestAccuracy: 0.74 },
  { userId: 'u-vikram', totalPoints: 220, quizzesPlayed: 4, bestAccuracy: 0.70 },
];
