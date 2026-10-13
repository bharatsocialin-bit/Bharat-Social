/**
 * Idempotent badge seed script.
 *
 * Seeds 33 badge definitions across 5 groups:
 *   A. India Quiz badges (10) — completion, accuracy, categories, correct answers
 *   B. Streak badges (6) — 3, 7, 14, 30, 100, 365 days
 *   C. Points badges (5) — 100, 500, 1500, 3000, 10000 points
 *   D. Chat/community badges (5) — INACTIVE until real features ship
 *   E. Platform exploration badges (7) — profile, posts, comments, follows, shorts
 *
 * Each badge has a stable slug used as the natural key, so re-running
 * the seed never creates duplicates.
 *
 * Run: bunx tsx scripts/seed-badges.ts
 */
import { db } from '@/lib/db';

interface SeedBadge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  group: 'quiz' | 'streak' | 'points' | 'chat' | 'platform';
  criteriaType: string;
  criteriaValue?: number | null;
  active: boolean;
  hint?: string;
}

const BADGES: SeedBadge[] = [
  // ── A. India Quiz badges (10) ────────────────────────────────────────────
  {
    slug: 'quiz-beginner',
    name: 'Quiz Beginner',
    description: 'Complete your first India Quiz.',
    icon: 'sparkles',
    gradient: 'from-teal-500 to-emerald-600',
    rarity: 'common',
    group: 'quiz',
    criteriaType: 'quiz-completion-count',
    criteriaValue: 1,
    active: true,
    hint: 'Play any India Quiz category or daily challenge.',
  },
  {
    slug: 'knowledge-seeker',
    name: 'Knowledge Seeker',
    description: 'Complete 10 India Quizzes.',
    icon: 'book-open',
    gradient: 'from-sky-500 to-blue-600',
    rarity: 'uncommon',
    group: 'quiz',
    criteriaType: 'quiz-completion-count',
    criteriaValue: 10,
    active: true,
    hint: 'Each completed quiz counts toward this badge — daily or category.',
  },
  {
    slug: 'quiz-enthusiast',
    name: 'Quiz Enthusiast',
    description: 'Complete 50 India Quizzes.',
    icon: 'brain',
    gradient: 'from-indigo-500 to-violet-600',
    rarity: 'rare',
    group: 'quiz',
    criteriaType: 'quiz-completion-count',
    criteriaValue: 50,
    active: true,
    hint: 'A long-term goal — keep playing daily to reach 50 quizzes.',
  },
  {
    slug: 'quiz-champion',
    name: 'Quiz Champion',
    description: 'Complete 100 India Quizzes.',
    icon: 'trophy',
    gradient: 'from-amber-500 to-orange-600',
    rarity: 'epic',
    group: 'quiz',
    criteriaType: 'quiz-completion-count',
    criteriaValue: 100,
    active: true,
    hint: 'A true champion — 100 completed quizzes is a major milestone.',
  },
  {
    slug: 'perfect-score',
    name: 'Perfect Score',
    description: 'Answer every question correctly in a single quiz.',
    icon: 'award',
    gradient: 'from-amber-500 to-yellow-600',
    rarity: 'uncommon',
    group: 'quiz',
    criteriaType: 'perfect-score',
    criteriaValue: null,
    active: true,
    hint: 'Get 100% accuracy on any quiz, of any length.',
  },
  {
    slug: 'accuracy-expert',
    name: 'Accuracy Expert',
    description: 'Maintain at least 90% accuracy across 50 completed questions.',
    icon: 'target',
    gradient: 'from-emerald-500 to-teal-600',
    rarity: 'rare',
    group: 'quiz',
    criteriaType: 'accuracy-over-questions',
    criteriaValue: 50, // 50 questions minimum, 90% accuracy
    active: true,
    hint: 'Answer at least 50 questions across all quizzes with ≥90% correct overall.',
  },
  {
    slug: 'category-explorer',
    name: 'Category Explorer',
    description: 'Complete quizzes in 5 different categories.',
    icon: 'compass',
    gradient: 'from-cyan-500 to-blue-600',
    rarity: 'uncommon',
    group: 'quiz',
    criteriaType: 'distinct-categories',
    criteriaValue: 5,
    active: true,
    hint: 'Try quizzes across History, Geography, Science, Sports, Culture, etc.',
  },
  {
    slug: 'india-knowledge-master',
    name: 'India Knowledge Master',
    description: 'Complete quizzes in all 10 quiz categories.',
    icon: 'crown',
    gradient: 'from-amber-400 to-yellow-600',
    rarity: 'legendary',
    group: 'quiz',
    criteriaType: 'distinct-categories',
    criteriaValue: 10,
    active: true,
    hint: 'The ultimate India Quiz achievement — play all 10 categories.',
  },
  {
    slug: 'question-master',
    name: 'Question Master',
    description: 'Answer 500 questions correctly across all quizzes.',
    icon: 'graduation-cap',
    gradient: 'from-violet-500 to-purple-600',
    rarity: 'epic',
    group: 'quiz',
    criteriaType: 'correct-answers-count',
    criteriaValue: 500,
    active: true,
    hint: 'A long-term goal — 500 correct answers across every quiz you play.',
  },
  {
    slug: 'grand-scholar',
    name: 'Grand Scholar',
    description: 'Answer 1,000 questions correctly across all quizzes.',
    icon: 'library',
    gradient: 'from-purple-600 to-fuchsia-700',
    rarity: 'legendary',
    group: 'quiz',
    criteriaType: 'correct-answers-count',
    criteriaValue: 1000,
    active: true,
    hint: 'The pinnacle of India Quiz mastery — 1,000 correct answers.',
  },

  // ── B. Streak badges (6) ──────────────────────────────────────────────────
  {
    slug: 'first-spark',
    name: 'First Spark',
    description: 'Maintain a 3-day quiz streak.',
    icon: 'flame',
    gradient: 'from-amber-500 to-orange-600',
    rarity: 'common',
    group: 'streak',
    criteriaType: 'streak-days',
    criteriaValue: 3,
    active: true,
    hint: 'Play a quiz on 3 consecutive IST days. Streaks reset if you skip a day.',
  },
  {
    slug: 'week-warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day quiz streak.',
    icon: 'flame',
    gradient: 'from-rose-500 to-orange-600',
    rarity: 'uncommon',
    group: 'streak',
    criteriaType: 'streak-days',
    criteriaValue: 7,
    active: true,
    hint: '7 consecutive days of quiz play.',
  },
  {
    slug: 'two-week-champion',
    name: 'Two-Week Champion',
    description: 'Maintain a 14-day quiz streak.',
    icon: 'flame',
    gradient: 'from-rose-600 to-red-700',
    rarity: 'rare',
    group: 'streak',
    criteriaType: 'streak-days',
    criteriaValue: 14,
    active: true,
    hint: 'Two full weeks of daily quiz play.',
  },
  {
    slug: 'monthly-dedication',
    name: 'Monthly Dedication',
    description: 'Maintain a 30-day quiz streak.',
    icon: 'flame',
    gradient: 'from-red-600 to-rose-700',
    rarity: 'epic',
    group: 'streak',
    criteriaType: 'streak-days',
    criteriaValue: 30,
    active: true,
    hint: 'A full month of daily quiz play — requires serious dedication.',
  },
  {
    slug: 'hundred-day-legend',
    name: '100-Day Legend',
    description: 'Maintain a 100-day quiz streak.',
    icon: 'flame',
    gradient: 'from-purple-600 to-fuchsia-700',
    rarity: 'legendary',
    group: 'streak',
    criteriaType: 'streak-days',
    criteriaValue: 100,
    active: true,
    hint: '100 consecutive days — a truly legendary streak.',
  },
  {
    slug: 'year-of-learning',
    name: 'Year of Learning',
    description: 'Maintain a 365-day quiz streak.',
    icon: 'flame',
    gradient: 'from-violet-700 to-purple-900',
    rarity: 'legendary',
    group: 'streak',
    criteriaType: 'streak-days',
    criteriaValue: 365,
    active: true,
    hint: 'A full year of daily quiz play — almost no one achieves this.',
  },

  // ── C. Points badges (5) ──────────────────────────────────────────────────
  {
    slug: 'first-100',
    name: 'First 100',
    description: 'Earn 100 points.',
    icon: 'star',
    gradient: 'from-amber-400 to-yellow-500',
    rarity: 'common',
    group: 'points',
    criteriaType: 'total-points',
    criteriaValue: 100,
    active: true,
    hint: 'Earn 100 points from any combination of quizzes.',
  },
  {
    slug: 'rising-star',
    name: 'Rising Star',
    description: 'Earn 500 points.',
    icon: 'star',
    gradient: 'from-amber-500 to-orange-600',
    rarity: 'uncommon',
    group: 'points',
    criteriaType: 'total-points',
    criteriaValue: 500,
    active: true,
    hint: '500 points — you can earn this with one perfect 5-question quiz.',
  },
  {
    slug: 'community-achiever',
    name: 'Community Achiever',
    description: 'Earn 1,500 points.',
    icon: 'star',
    gradient: 'from-orange-500 to-red-600',
    rarity: 'rare',
    group: 'points',
    criteriaType: 'total-points',
    criteriaValue: 1500,
    active: true,
    hint: '1,500 points across all your quizzes.',
  },
  {
    slug: 'knowledge-champion',
    name: 'Knowledge Champion',
    description: 'Earn 3,000 points.',
    icon: 'star',
    gradient: 'from-red-500 to-rose-700',
    rarity: 'epic',
    group: 'points',
    criteriaType: 'total-points',
    criteriaValue: 3000,
    active: true,
    hint: '3,000 points — a serious quiz player milestone.',
  },
  {
    slug: 'bharatsocial-legend',
    name: 'BharatSocial Legend',
    description: 'Earn 10,000 points.',
    icon: 'star',
    gradient: 'from-purple-600 to-fuchsia-800',
    rarity: 'legendary',
    group: 'points',
    criteriaType: 'total-points',
    criteriaValue: 10000,
    active: true,
    hint: '10,000 points — the highest points badge in BharatSocial.',
  },

  // ── D. Chat/community badges (5) — INACTIVE until features ship ──────────
  // These badges are defined but marked `active=false` because the
  // corresponding features (chat, recognition, helpful voting) have NOT
  // been implemented yet. They will be activated when those features ship.
  {
    slug: 'first-conversation',
    name: 'First Conversation',
    description: 'Participate in your first eligible chat.',
    icon: 'message-circle',
    gradient: 'from-slate-500 to-slate-700',
    rarity: 'common',
    group: 'chat',
    criteriaType: 'chat-participation-count',
    criteriaValue: 1,
    active: false, // Chat feature not yet implemented
    hint: 'Inactive — chat feature not yet available on BharatSocial.',
  },
  {
    slug: 'friendly-voice',
    name: 'Friendly Voice',
    description: 'Participate in chat on 7 distinct days.',
    icon: 'message-circle',
    gradient: 'from-slate-500 to-slate-700',
    rarity: 'uncommon',
    group: 'chat',
    criteriaType: 'chat-distinct-days',
    criteriaValue: 7,
    active: false,
    hint: 'Inactive — chat feature not yet available on BharatSocial.',
  },
  {
    slug: 'conversation-builder',
    name: 'Conversation Builder',
    description: 'Participate in chat on 30 distinct days.',
    icon: 'message-circle',
    gradient: 'from-slate-600 to-slate-800',
    rarity: 'rare',
    group: 'chat',
    criteriaType: 'chat-distinct-days',
    criteriaValue: 30,
    active: false,
    hint: 'Inactive — chat feature not yet available on BharatSocial.',
  },
  {
    slug: 'positive-contributor',
    name: 'Positive Contributor',
    description: 'Receive 10 positive community recognitions.',
    icon: 'heart',
    gradient: 'from-slate-500 to-slate-700',
    rarity: 'uncommon',
    group: 'chat',
    criteriaType: 'positive-recognitions',
    criteriaValue: 10,
    active: false, // Recognition feature not yet implemented
    hint: 'Inactive — community recognition feature not yet available.',
  },
  {
    slug: 'helpful-member',
    name: 'Helpful Member',
    description: 'Receive 25 helpful votes on your contributions.',
    icon: 'thumbs-up',
    gradient: 'from-slate-600 to-slate-800',
    rarity: 'rare',
    group: 'chat',
    criteriaType: 'helpful-votes',
    criteriaValue: 25,
    active: false, // Helpful voting feature not yet implemented
    hint: 'Inactive — helpful voting feature not yet available.',
  },

  // ── E. Platform exploration badges (7) ───────────────────────────────────
  {
    slug: 'profile-complete',
    name: 'Profile Complete',
    description: 'Complete all required profile fields: name, bio, state, city.',
    icon: 'user-check',
    gradient: 'from-sky-500 to-indigo-600',
    rarity: 'common',
    group: 'platform',
    criteriaType: 'profile-complete',
    criteriaValue: null,
    active: true,
    hint: 'Edit your profile to add your name, bio, state, and city.',
  },
  {
    slug: 'social-starter',
    name: 'Social Starter',
    description: 'Publish your first eligible post.',
    icon: 'feather',
    gradient: 'from-saffron to-amber-600',
    rarity: 'common',
    group: 'platform',
    criteriaType: 'posts-count',
    criteriaValue: 1,
    active: true,
    hint: 'Write and publish your first post on the Feed.',
  },
  {
    slug: 'conversation-starter',
    name: 'Conversation Starter',
    description: 'Receive your first comment on a post.',
    icon: 'message-square',
    gradient: 'from-emerald-500 to-teal-600',
    rarity: 'common',
    group: 'platform',
    criteriaType: 'received-comments-count',
    criteriaValue: 1,
    active: true,
    hint: 'When someone comments on your post, you earn this badge.',
  },
  {
    slug: 'connected',
    name: 'Connected',
    description: 'Follow 10 distinct users.',
    icon: 'users',
    gradient: 'from-cyan-500 to-blue-600',
    rarity: 'uncommon',
    group: 'platform',
    criteriaType: 'following-count',
    criteriaValue: 10,
    active: true,
    hint: 'Follow 10 different users — self-follows do not count.',
  },
  {
    slug: 'content-creator',
    name: 'Content Creator',
    description: 'Publish 25 eligible posts.',
    icon: 'pen-tool',
    gradient: 'from-violet-500 to-purple-600',
    rarity: 'rare',
    group: 'platform',
    criteriaType: 'posts-count',
    criteriaValue: 25,
    active: true,
    hint: 'Publish 25 posts. Deleted posts and duplicate spam do not count.',
  },
  {
    slug: 'shorts-creator',
    name: 'Shorts Creator',
    description: 'Publish 10 eligible Shorts.',
    icon: 'film',
    gradient: 'from-rose-500 to-pink-600',
    rarity: 'rare',
    group: 'platform',
    criteriaType: 'shorts-count',
    criteriaValue: 10,
    active: true,
    hint: 'Upload 10 Shorts. Deleted and moderated-out Shorts do not count.',
  },
  {
    slug: 'community-regular',
    name: 'Community Regular',
    description: 'Participate meaningfully on 7 distinct days.',
    icon: 'calendar-check',
    gradient: 'from-indigo-500 to-violet-600',
    rarity: 'uncommon',
    group: 'platform',
    criteriaType: 'distinct-activity-days',
    criteriaValue: 7,
    active: true,
    hint: 'Have any qualifying activity (post, comment, like, follow, quiz) on 7 different IST days. Self-likes and spam are excluded.',
  },
];

async function main() {
  console.log('=== Seeding BharatSocial Badges ===\n');

  let inserted = 0, updated = 0, skipped = 0;
  for (const b of BADGES) {
    const existing = await db.badge.findUnique({ where: { slug: b.slug } });
    if (existing) {
      // Update mutable fields (description, hint, rarity, gradient) but
      // preserve the slug + active state (admin may have toggled it).
      // We DO update `active` if the seed value is `false` (so newly-inactive
      // chat badges stay inactive), but we DON'T downgrade an admin-set
      // active=true to active=false — admin choice wins for activation.
      const nextActive = existing.active === true ? true : b.active;
      const needsUpdate =
        existing.name !== b.name ||
        existing.description !== b.description ||
        existing.icon !== b.icon ||
        existing.gradient !== b.gradient ||
        existing.rarity !== b.rarity ||
        existing.group !== b.group ||
        existing.criteriaType !== b.criteriaType ||
        existing.criteriaValue !== b.criteriaValue ||
        existing.active !== nextActive ||
        existing.hint !== (b.hint || null);
      if (needsUpdate) {
        await db.badge.update({
          where: { slug: b.slug },
          data: {
            name: b.name,
            description: b.description,
            icon: b.icon,
            gradient: b.gradient,
            rarity: b.rarity,
            group: b.group,
            criteriaType: b.criteriaType,
            criteriaValue: b.criteriaValue ?? null,
            active: nextActive,
            hint: b.hint || null,
          },
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      await db.badge.create({
        data: {
          slug: b.slug,
          name: b.name,
          description: b.description,
          icon: b.icon,
          gradient: b.gradient,
          rarity: b.rarity,
          group: b.group,
          criteriaType: b.criteriaType,
          criteriaValue: b.criteriaValue ?? null,
          active: b.active,
          hint: b.hint || null,
        },
      });
      inserted++;
    }
  }

  console.log(`  ✓ Inserted: ${inserted}`);
  console.log(`  ✓ Updated: ${updated}`);
  console.log(`  ✓ Skipped (unchanged): ${skipped}`);
  console.log(`  Total badges: ${BADGES.length}`);

  // Print summary by group
  console.log('\n=== Badges by group ===');
  const groups = ['quiz', 'streak', 'points', 'chat', 'platform'] as const;
  for (const g of groups) {
    const total = await db.badge.count({ where: { group: g } });
    const active = await db.badge.count({ where: { group: g, active: true } });
    console.log(`  ${g}: ${total} total, ${active} active`);
  }

  console.log('\n=== Badges by rarity ===');
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
  for (const r of rarities) {
    const total = await db.badge.count({ where: { rarity: r } });
    console.log(`  ${r}: ${total}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
