import type { TrendingTopic, SuggestedAccount } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — fictional trending topics and suggested follows.
// ───────────────────────────────────────────────────────────────────────────

export const DEMO_TRENDING: TrendingTopic[] = [
  { id: 't-1', category: 'Technology · Trending in India', title: '#MadeInIndia', postsCount: 18420 },
  { id: 't-2', category: 'Cricket · Trending', title: 'IPL Final', postsCount: 92300 },
  { id: 't-3', category: 'Education · Trending', title: '#GATE2026', postsCount: 12840 },
  { id: 't-4', category: 'Food · Trending in Chennai', title: 'Filter Coffee', postsCount: 4120 },
  { id: 't-5', category: 'Travel · Trending', title: '#HimalayaDiaries', postsCount: 8730 },
  { id: 't-6', category: 'Entertainment · Trending', title: '#IndieMusic', postsCount: 6710 },
];

export const DEMO_SUGGESTED: SuggestedAccount[] = [
  { userId: 'u-vikram', reason: 'Photographers you might enjoy' },
  { userId: 'u-meera', reason: 'Popular among food lovers' },
  { userId: 'u-arjun', reason: 'Trending in travel' },
];
