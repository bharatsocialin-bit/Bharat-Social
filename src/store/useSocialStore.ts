'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import type {
  DemoPost,
  NavKey,
  FeedTab,
  DemoReply,
  Language,
  PulseTab,
  VideoPost,
  QuizTab,
  QuizAttempt,
  QuizQuestion,
} from '@/lib/types';
import { DEMO_POSTS } from '@/data/posts';
import { CURRENT_USER_ID, DEMO_USER_MAP } from '@/data/users';
import { DEFAULT_PULSE_CITY_ID } from '@/data/pulse-cities';
import { DEMO_SHORTS } from '@/data/shorts';
import { getQuestionsForCategory, QUIZ_QUESTION_MAP } from '@/data/quiz-questions';
import { getTodayChallenge } from '@/data/quiz-meta';

/**
 * Shape of the signed-in user's own profile as returned by GET /api/profile
 * (`{ user: ... }`). Only fields the shell UI needs are declared; the store
 * keeps whatever the API returned.
 */
export interface CurrentProfileUser {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  avatarGradient?: string | null;
  initials?: string | null;
  bio?: string | null;
  state?: string | null;
  role?: string;
}

interface SocialState {
  // ── Navigation / view state ────────────────────────────────────────────
  activeNav: NavKey;
  setActiveNav: (nav: NavKey) => void;

  feedTab: FeedTab;
  setFeedTab: (tab: FeedTab) => void;

  // The profile being viewed, if any. null means "no profile open".
  viewedProfileUserId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;

  // Full-screen "Edit profile" view (own profile only — feature: complete
  // profile system). Rendered above all other views while open.
  editProfileOpen: boolean;
  openEditProfile: () => void;
  closeEditProfile: () => void;

  // ── Current user's REAL profile (feature: complete profile system) ─────
  // Loaded once per session from GET /api/profile and refreshed after
  // profile edits / avatar changes, so the sidebar, composer, reply panel
  // and mobile nav all show the real name, @username and profile photo
  // instead of the demo placeholder.
  currentProfileUser: CurrentProfileUser | null;
  currentProfileStatus: 'idle' | 'loading' | 'ready' | 'error';
  loadCurrentProfile: () => Promise<void>;
  clearCurrentProfile: () => void;

  // ── Posts ────────────────────────────────────────────────────────────────
  posts: DemoPost[];
  addPost: (content: string, language: Language) => void;
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  toggleBookmark: (postId: string) => void;
  addReply: (postId: string, content: string, language: Language) => void;

  // ── Bhasha Bridge — per-post translation toggle ───────────────────────────
  // Holds the IDs of posts currently shown in their "Translated" view.
  // Per-post toggling keeps the UI simple and avoids race conditions
  // between translations of long feeds.
  translatedPostIds: Set<string>;
  toggleTranslation: (postId: string) => void;
  isPostTranslated: (postId: string) => boolean;

  // ── Following (for "Following" tab + suggested accounts) ────────────────
  followingIds: Set<string>;
  toggleFollow: (userId: string) => void;

  // ── Search ─────────────────────────────────────────────────────────────
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // ── India Pulse ────────────────────────────────────────────────────────
  // The currently selected city in India Pulse.
  pulseCityId: string;
  setPulseCityId: (cityId: string) => void;

  // Top-level tab inside India Pulse: trending / user-stories / community / about.
  pulseTab: PulseTab;
  setPulseTab: (tab: PulseTab) => void;

  // Topic detail view. null means "no topic open".
  viewedTopicId: string | null;
  openTopic: (topicId: string) => void;
  closeTopic: () => void;

  // ── India Pulse: User Stories viewer state ────────────────────────────
  // When non-null, the full-screen StoryViewer is open. The viewer reads
  // its own groups list but uses this state to know WHICH author's group
  // to play first and at which story index.
  storyViewerState: { authorId: string; startIndex: number } | null;
  openStoryViewer: (authorId: string, startIndex?: number) => void;
  closeStoryViewer: () => void;

  // Whether the full-screen StoryCreator dialog is open.
  storyCreatorOpen: boolean;
  setStoryCreatorOpen: (open: boolean) => void;

  // Whether the creator's StoryArchive view is open.
  storyArchiveOpen: boolean;
  setStoryArchiveOpen: (open: boolean) => void;

  // ── Shorts — vertical video feed ───────────────────────────────────────
  shorts: VideoPost[];
  shortsMuted: boolean;
  toggleShortsMuted: () => void;
  toggleShortLike: (videoId: string) => void;
  toggleShortSave: (videoId: string) => void;
  addShort: (short: Omit<VideoPost, 'id' | 'createdAt' | 'likes' | 'comments' | 'shares'>) => void;

  // ── Interface language preference ──────────────────────────────────────
  // The language the UI itself is displayed in. Defaults to English.
  // In this prototype, only a subset of UI labels are translated — the
  // architecture is ready for a full i18n library (next-intl) later.
  interfaceLanguage: Language;
  setInterfaceLanguage: (lang: Language) => void;

  // ── Preferred content languages ────────────────────────────────────────
  // Languages the user wants to see content in. Used by feed filtering.
  preferredContentLanguages: Set<Language>;
  togglePreferredContentLanguage: (lang: Language) => void;

  // ── India Quiz ─────────────────────────────────────────────────────────
  quizTab: QuizTab;
  setQuizTab: (tab: QuizTab) => void;

  // The language the user wants to play the quiz in. Defaults to 'en'.
  quizLanguage: Language;
  setQuizLanguage: (lang: Language) => void;

  // Active quiz session. null means no quiz is in progress.
  // Session state is now client-side only (in-memory) — the source of
  // truth for questions/answers/scores lives on the server. We keep
  // a session here so the QuestionCard can render live state without
  // re-fetching on every answer.
  quizSession: QuizSession | null;
  startCategoryQuiz: (categoryId: string) => Promise<boolean>;
  startDailyQuiz: () => Promise<boolean>;
  submitAnswer: (questionId: string, selectedOptionIndex: number | null, timeTakenSeconds?: number) => void;
  nextQuestion: () => void;
  endQuiz: () => Promise<void>;
  exitQuiz: () => void;
  // Refresh leaderboard / achievements / history from the server.
  refreshQuizStats: () => Promise<void>;

  // Completed attempts — used for personal best, streaks, achievements.
  quizAttempts: QuizAttempt[];
  earnedAchievementIds: Set<string>;
  quizStreakDays: number; // consecutive days the user has played
  quizLastPlayedDate: string | null; // YYYY-MM-DD

  // Daily challenge completion — keyed by date. Prevents duplicate submissions.
  dailyCompletedDates: Set<string>;
  // Today's daily challenge info (loaded from /api/quiz/daily).
  dailyToday: { date: string; questionIds: string[]; title: string; hasCompletedToday: boolean } | null;
}

/** Active quiz session — one play-through in progress.
 *
 * NOTE: The `correctOptionIndex` and `correct` fields are LOCAL OPTIMISTIC
 * values used to render the "Correct!" / "Incorrect" UI immediately. The
 * authoritative score is computed by the server when endQuiz() posts the
 * attempt to /api/quiz/attempts. If the client's optimistic guess disagrees
 * with the server (which would be a bug), the server's value wins.
 */
interface QuizSession {
  /** 'category' or 'daily'. */
  type: 'category' | 'daily';
  /** Category id (for type='category') or daily challenge date YYYY-MM-DD (for type='daily'). */
  refId: string;
  /** The questions for this session, in order. */
  questions: QuizQuestion[];
  /** Index of the current question. */
  currentIndex: number;
  /** Per-question answers collected so far. */
  answers: Array<{
    questionId: string;
    selectedOptionIndex: number | null; // null = not answered (e.g. timed out)
    /** Local optimistic guess at whether this is correct — server is authoritative. */
    correct: boolean;
    points: number;
    timeTakenSeconds?: number;
  }>;
  /** ISO timestamp when the session started. */
  startedAt: string;
  /** Whether the results screen is showing. */
  finished: boolean;
  /** Error message if submission failed (null = no error). */
  submitError: string | null;
  /** Server response after endQuiz() completes — contains the graded attempt. */
  serverResult?: {
    attemptId: string;
    totalPoints: number;
    correctCount: number;
    totalQuestions: number;
    /** Per-question graded answers (with correctOptionIndex revealed). */
    gradedAnswers: Array<{
      questionId: string;
      selectedOptionIndex: number | null;
      correctOptionIndex: number;
      correct: boolean;
      points: number;
      timeTakenSeconds: number;
    }>;
    /** Slugs of newly-awarded achievements. */
    newlyAwardedAchievements: string[];
  };
}

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${(idCounter += 1)}`;

export const useSocialStore = create<SocialState>((set, get) => ({
  activeNav: 'home',
  setActiveNav: (nav) => set({ activeNav: nav, viewedProfileUserId: null, viewedTopicId: null }),

  feedTab: 'for-you',
  setFeedTab: (tab) => set({ feedTab: tab }),

  viewedProfileUserId: null,
  openProfile: (userId) => set({ viewedProfileUserId: userId }),
  closeProfile: () => set({ viewedProfileUserId: null }),

  editProfileOpen: false,
  openEditProfile: () => set({ editProfileOpen: true, viewedProfileUserId: null }),
  closeEditProfile: () => set({ editProfileOpen: false }),

  // ── Current user's real profile ─────────────────────────────────────────────
  currentProfileUser: null,
  currentProfileStatus: 'idle',
  loadCurrentProfile: async () => {
    if (get().currentProfileStatus === 'loading') return;
    set({ currentProfileStatus: 'loading' });
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error(`profile fetch ${res.status}`);
      const data = (await res.json()) as { user?: CurrentProfileUser };
      set({ currentProfileUser: data?.user ?? null, currentProfileStatus: 'ready' });
    } catch {
      set({ currentProfileStatus: 'error' });
    }
  },
  clearCurrentProfile: () =>
    set({ currentProfileUser: null, currentProfileStatus: 'idle' }),

  posts: DEMO_POSTS,
  addPost: (content, language) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const newPost: DemoPost = {
      id: nextId('p'),
      authorId: CURRENT_USER_ID,
      content: trimmed,
      language,
      createdAt: new Date().toISOString(),
      likes: 0,
      reposts: 0,
      replies: [],
    };
    set((s) => ({ posts: [newPost, ...s.posts] }));
  },
  toggleLike: (postId) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1,
            }
          : p,
      ),
    })),
  toggleRepost: (postId) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              reposted: !p.reposted,
              reposts: p.reposted ? Math.max(0, p.reposts - 1) : p.reposts + 1,
            }
          : p,
      ),
    })),
  toggleBookmark: (postId) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p,
      ),
    })),
  addReply: (postId, content, language) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const reply: DemoReply = {
      id: nextId('r'),
      authorId: CURRENT_USER_ID,
      content: trimmed,
      language,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, replies: [...p.replies, reply] } : p,
      ),
    }));
  },

  // The viewer follows a few of the demo accounts by default.
  followingIds: new Set<string>(['u-aarav', 'u-rohan', 'u-meera']),
  toggleFollow: (userId) =>
    set((s) => {
      const next = new Set(s.followingIds);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return { followingIds: next };
    }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // ── Bhasha Bridge ───────────────────────────────────────────────────────
  translatedPostIds: new Set<string>(),
  toggleTranslation: (postId) =>
    set((s) => {
      const next = new Set(s.translatedPostIds);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return { translatedPostIds: next };
    }),
  isPostTranslated: (postId) => get().translatedPostIds.has(postId),

  // ── India Pulse ────────────────────────────────────────────────────────
  pulseCityId: DEFAULT_PULSE_CITY_ID,
  setPulseCityId: (cityId) => set({ pulseCityId: cityId, viewedTopicId: null }),

  pulseTab: 'city',
  setPulseTab: (tab) => set({ pulseTab: tab, viewedTopicId: null }),

  viewedTopicId: null,
  openTopic: (topicId) => set({ viewedTopicId: topicId }),
  closeTopic: () => set({ viewedTopicId: null }),

  // ── India Pulse: User Stories viewer state ────────────────────────────
  storyViewerState: null,
  openStoryViewer: (authorId, startIndex = 0) =>
    set({ storyViewerState: { authorId, startIndex } }),
  closeStoryViewer: () => set({ storyViewerState: null }),

  storyCreatorOpen: false,
  setStoryCreatorOpen: (open) => set({ storyCreatorOpen: open }),

  storyArchiveOpen: false,
  setStoryArchiveOpen: (open) => set({ storyArchiveOpen: open }),

  // ── Shorts ─────────────────────────────────────────────────────────────
  shorts: DEMO_SHORTS,
  shortsMuted: true, // Start muted — never autoplay sound
  toggleShortsMuted: () => set((s) => ({ shortsMuted: !s.shortsMuted })),
  toggleShortLike: (videoId) =>
    set((s) => ({
      shorts: s.shorts.map((v) =>
        v.id === videoId
          ? {
              ...v,
              liked: !v.liked,
              likes: v.liked ? Math.max(0, v.likes - 1) : v.likes + 1,
            }
          : v,
      ),
    })),
  toggleShortSave: (videoId) =>
    set((s) => ({
      shorts: s.shorts.map((v) =>
        v.id === videoId ? { ...v, saved: !v.saved } : v,
      ),
    })),
  addShort: (short) =>
    set((s) => ({
      shorts: [
        {
          ...short,
          id: nextId('v'),
          createdAt: new Date().toISOString(),
          likes: 0,
          comments: 0,
          shares: 0,
        },
        ...s.shorts,
      ],
    })),

  // ── Interface language ─────────────────────────────────────────────────
  interfaceLanguage: 'en',
  setInterfaceLanguage: (lang) => set({ interfaceLanguage: lang }),

  // ── Preferred content languages — default to English + a couple major Indian languages.
  preferredContentLanguages: new Set<Language>(['en', 'hi', 'te']),
  togglePreferredContentLanguage: (lang) =>
    set((s) => {
      const next = new Set(s.preferredContentLanguages);
      if (next.has(lang)) {
        // Never let the user remove all languages — keep at least one.
        if (next.size > 1) next.delete(lang);
      } else {
        next.add(lang);
      }
      return { preferredContentLanguages: next };
    }),

  // ── India Quiz ─────────────────────────────────────────────────────────
  quizTab: 'play',
  setQuizTab: (tab) => set({ quizTab: tab }),

  quizLanguage: 'en',
  setQuizLanguage: (lang) => set({ quizLanguage: lang }),

  quizSession: null,

  // Start a category quiz by fetching 5 random published questions from
  // the server. Returns true on success, false on failure (network error
  // or empty question set).
  startCategoryQuiz: async (categoryId) => {
    try {
      const res = await fetch(`/api/quiz/questions?categoryId=${encodeURIComponent(categoryId)}&count=5`);
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.questions || data.questions.length === 0) return false;
      set({
        quizSession: {
          type: 'category',
          refId: categoryId,
          questions: data.questions,
          currentIndex: 0,
          answers: [],
          startedAt: new Date().toISOString(),
          finished: false,
          submitError: null,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  // Start today's daily challenge by fetching today's question IDs from
  // the server, then fetching the question text/options for each.
  startDailyQuiz: async () => {
    try {
      const dailyRes = await fetch('/api/quiz/daily');
      if (!dailyRes.ok) return false;
      const daily = await dailyRes.json();
      if (!daily.questionIds || daily.questionIds.length === 0) return false;
      // Fetch the actual questions by hitting /api/quiz/questions with
      // each ID. Since our questions endpoint takes a categoryId (not IDs),
      // we fetch ALL daily questions across all categories by querying
      // each category. But that's wasteful — instead, let's just fetch
      // the first 5 questions from cat-gk as a fallback if we can't get
      // the specific daily IDs.
      //
      // Actually the cleanest fix: extend the questions endpoint to accept
      // ?ids=id1,id2,id3. For now, fall back to fetching from cat-gk.
      const idsParam = daily.questionIds.join(',');
      const qRes = await fetch(`/api/quiz/questions?ids=${encodeURIComponent(idsParam)}&count=${daily.questionIds.length}`);
      if (!qRes.ok) return false;
      const qData = await qRes.json();
      if (!qData.questions || qData.questions.length === 0) return false;
      set({
        quizSession: {
          type: 'daily',
          refId: daily.date,
          questions: qData.questions,
          currentIndex: 0,
          answers: [],
          startedAt: new Date().toISOString(),
          finished: false,
          submitError: null,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  // Submit an answer to the current question. Optimistic — the local
  // state records the selected option index. The CORRECT answer is not
  // known to the client until endQuiz() posts the attempt to the server
  // and the server returns the graded result.
  //
  // For the immediate "Correct!" / "Incorrect" UI feedback, we have NO
  // way to know correctness client-side (correctOptionIndex is hidden
  // by the API). So we record the answer WITHOUT a correctness flag —
  // the QuestionCard will show "Answer submitted" instead of "Correct!"
  // until endQuiz() reveals the graded result.
  submitAnswer: (questionId, selectedOptionIndex, timeTakenSeconds) =>
    set((s) => {
      if (!s.quizSession) return {};
      // Prevent multiple answers to the same question.
      const alreadyAnswered = s.quizSession.answers.find((a) => a.questionId === questionId);
      if (alreadyAnswered) return {};
      return {
        quizSession: {
          ...s.quizSession,
          answers: [
            ...s.quizSession.answers,
            {
              questionId,
              selectedOptionIndex,
              // Optimistic — server will overwrite on endQuiz()
              correct: false,
              points: 0,
              timeTakenSeconds,
            },
          ],
        },
      };
    }),

  nextQuestion: () =>
    set((s) => {
      if (!s.quizSession) return {};
      const nextIndex = s.quizSession.currentIndex + 1;
      if (nextIndex >= s.quizSession.questions.length) {
        return { quizSession: { ...s.quizSession, finished: true } };
      }
      return { quizSession: { ...s.quizSession, currentIndex: nextIndex } };
    }),

  // Submit the in-progress session to the server for scoring.
  // The server returns the graded result (with correctOptionIndex revealed)
  // which we store on the session so the results screen can show "Correct!"/
  // "Incorrect" with the actual correct answer.
  endQuiz: async () => {
    const s = get();
    if (!s.quizSession) return;
    const session = s.quizSession;
    const body = {
      type: session.type,
      refId: session.refId,
      startedAt: session.startedAt,
      questionIds: session.questions.map((q) => q.id),
      answers: session.questions.map((q) => {
        const ans = session.answers.find((a) => a.questionId === q.id);
        return {
          questionId: q.id,
          selectedOptionIndex: ans?.selectedOptionIndex ?? null,
          timeTakenSeconds: ans?.timeTakenSeconds ?? 0,
        };
      }),
    };
    try {
      const res = await fetch('/api/quiz/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Server rejected — set submitError on the session so the
        // ResultsScreen can show an error + retry button. Do NOT clear
        // the session — the user's answers are still in memory.
        const errData = await res.json().catch(() => ({}));
        console.error('Quiz submit failed:', errData);
        set((s2) => ({
          quizSession: s2.quizSession
            ? { ...s2.quizSession, submitError: errData?.error || 'Submission failed. Please try again.' }
            : null,
        }));
        return;
      }
      const data = await res.json();
      // Stash the server's graded result on the session so the ResultsScreen
      // can render the correct-answer reveal.
      set((s2) => ({
        quizSession: s2.quizSession
          ? {
              ...s2.quizSession,
              submitError: null,
              serverResult: {
                attemptId: data.attempt.id,
                totalPoints: data.attempt.totalPoints,
                correctCount: data.attempt.correctCount,
                totalQuestions: data.attempt.totalQuestions,
                gradedAnswers: data.attempt.answers,
                newlyAwardedAchievements: data.newlyAwardedAchievements || [],
              },
            }
          : null,
      }));
      // Refresh leaderboard / achievements / streak from the server.
      await get().refreshQuizStats();
    } catch (e) {
      console.error('endQuiz network error:', e);
      set((s2) => ({
        quizSession: s2.quizSession
          ? { ...s2.quizSession, submitError: 'Network error. Please check your connection and try again.' }
          : null,
      }));
    }
  },

  exitQuiz: () => set({ quizSession: null }),

  // Refresh quiz stats from the server. Called after each attempt completes
  // so the leaderboard / achievements / streak reflect the latest data.
  refreshQuizStats: async () => {
    try {
      const [histRes, achRes, streakRes, dailyRes] = await Promise.all([
        fetch('/api/quiz/history'),
        fetch('/api/quiz/achievements'),
        fetch('/api/quiz/streak'),
        fetch('/api/quiz/daily'),
      ]);
      const updates: Partial<SocialState> = {};
      if (histRes.ok) {
        const hist = await histRes.json();
        updates.quizAttempts = (hist.attempts || []).map((a: { id: string; type: string; refId: string; totalPoints: number; correctCount: number; totalQuestions: number; startedAt: string; finishedAt: string; }) => ({
          id: a.id,
          type: a.type as 'category' | 'daily',
          refId: a.refId,
          startedAt: a.startedAt,
          finishedAt: a.finishedAt,
          language: 'en' as Language,
          answers: [],
          totalPoints: a.totalPoints,
          correctCount: a.correctCount,
          totalQuestions: a.totalQuestions,
        }));
      }
      if (achRes.ok) {
        const ach = await achRes.json();
        updates.earnedAchievementIds = new Set(
          (ach.achievements || []).filter((a: { earned: boolean; slug: string }) => a.earned).map((a: { slug: string }) => a.slug),
        );
      }
      if (streakRes.ok) {
        const streak = await streakRes.json();
        updates.quizStreakDays = streak.currentStreak || 0;
        updates.quizLastPlayedDate = streak.lastPlayedDate || null;
      }
      if (dailyRes.ok) {
        const daily = await dailyRes.json();
        updates.dailyToday = {
          date: daily.date,
          questionIds: daily.questionIds || [],
          title: daily.title,
          hasCompletedToday: !!daily.hasCompletedToday,
        };
        if (daily.hasCompletedToday) {
          const newSet = new Set(get().dailyCompletedDates);
          newSet.add(daily.date);
          updates.dailyCompletedDates = newSet;
        }
      }
      set(updates);
    } catch (e) {
      console.error('refreshQuizStats failed:', e);
    }
  },

  quizAttempts: [],
  earnedAchievementIds: new Set<string>(),
  quizStreakDays: 0,
  quizLastPlayedDate: null,
  dailyCompletedDates: new Set<string>(),
  dailyToday: null,
}));

// ── Selectors / derived helpers ────────────────────────────────────────────

/**
 * Returns the filtered list of posts for the current feed view.
 *
 * Why we subscribe to primitives and derive with useMemo:
 * Zustand uses `Object.is` for selector equality by default. Returning a
 * freshly-built array from a selector would create a new reference on every
 * call, causing the "getSnapshot should be cached" infinite loop warning.
 * By subscribing to primitives and deriving with useMemo, the array
 * reference is stable across renders that don't change the inputs.
 */
export function useFilteredPosts(): DemoPost[] {
  const posts = useSocialStore((s) => s.posts);
  const tab = useSocialStore((s) => s.feedTab);
  // followingIds is a Set — to keep the subscription stable across mutations
  // we shallow-compare its array form.
  const followingArr = useSocialStore(
    useShallow((s) => Array.from(s.followingIds).sort()),
  );
  const query = useSocialStore((s) => s.searchQuery);

  return useMemo(() => {
    const following = new Set(followingArr);
    let list = posts;
    if (tab === 'following') {
      list = list.filter(
        (p) => following.has(p.authorId) || p.authorId === CURRENT_USER_ID,
      );
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => {
        const author = DEMO_USER_MAP[p.authorId];
        return (
          p.content.toLowerCase().includes(q) ||
          author?.name.toLowerCase().includes(q) ||
          author?.handle.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [posts, tab, followingArr, query]);
}
