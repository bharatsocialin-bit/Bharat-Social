import type { TrendingTopic, SuggestedAccount } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — fictional trending topics and suggested follows.
// Faith-themed for Lordsbook.
// ───────────────────────────────────────────────────────────────────────────

export const DEMO_TRENDING: TrendingTopic[] = [
  { id: 't-1', category: 'Scripture · Trending', title: '#VerseOfTheDay', postsCount: 5600 },
  { id: 't-2', category: 'Prayer · Trending', title: '#PrayerWall', postsCount: 3800 },
  { id: 't-3', category: 'Study · Trending', title: '#BibleStudy', postsCount: 4200 },
  { id: 't-4', category: 'Community · Trending', title: '#FaithInAction', postsCount: 2900 },
  { id: 't-5', category: 'Church · Trending', title: '#ChurchLife', postsCount: 2100 },
  { id: 't-6', category: 'Worship · Trending', title: '#PraiseReport', postsCount: 1750 },
];

export const DEMO_SUGGESTED: SuggestedAccount[] = [
  { userId: 'u-vikram', reason: 'Faith builders you might enjoy' },
  { userId: 'u-meera', reason: 'Popular among Bible study groups' },
  { userId: 'u-arjun', reason: 'Trending in faith community' },
];
