'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Calendar,
  Trophy,
  Award,
  Play,
  ChevronRight,
  Flame,
  Globe,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { QUIZ_CATEGORIES } from '@/data/quiz-categories';
import type { QuizTab, Language } from '@/lib/types';
import { languageLabel, formatCount } from '@/lib/format';
import { getCategoryLabel } from '@/lib/quiz-i18n';
import { QuestionCard } from './QuestionCard';
import { ResultsScreen } from './ResultsScreen';
import { LeaderboardPanel } from './LeaderboardPanel';
import { AchievementsPanel } from './AchievementsPanel';
import { EmptyState } from '@/components/social/EmptyState';
import { useAuth } from '@/hooks/use-auth';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';

const TABS: { key: QuizTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'play', label: 'Play', icon: Play },
  { key: 'daily', label: 'Daily', icon: Calendar },
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { key: 'achievements', label: 'Badges', icon: Award },
];

const QUIZ_LANGUAGES: Language[] = ['en', 'hi', 'te'];

export function QuizView() {
  const quizTab = useSocialStore((s) => s.quizTab);
  const setQuizTab = useSocialStore((s) => s.setQuizTab);
  const session = useSocialStore((s) => s.quizSession);
  const exitQuiz = useSocialStore((s) => s.exitQuiz);
  const refreshQuizStats = useSocialStore((s) => s.refreshQuizStats);

  // On mount: fetch quiz stats from the server (attempts, achievements, streak, daily).
  useEffect(() => {
    refreshQuizStats();
  }, [refreshQuizStats]);

  // If a session is active, render the question or results screen.
  if (session) {
    if (session.finished) {
      return <ResultsScreenInline />;
    }
    return (
      <div className="flex min-h-full flex-col">
        {/* Exit button bar */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {session.type === 'daily' ? 'Daily Challenge' : 'Quiz in progress'}
          </span>
          <button
            type="button"
            onClick={exitQuiz}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
            Exit
          </button>
        </div>
        <ActiveQuiz />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <QuizHeader />
      <QuizTabs activeTab={quizTab} onTabChange={setQuizTab} />

      <div className="flex-1">
        {quizTab === 'play' && <PlayPanel />}
        {quizTab === 'daily' && <DailyPanel />}
        {quizTab === 'leaderboard' && <LeaderboardPanel />}
        {quizTab === 'achievements' && <AchievementsPanel />}
      </div>
    </div>
  );
}

/** Renders the active quiz session — the QuestionCard for the current question. */
function ActiveQuiz() {
  const session = useSocialStore((s) => s.quizSession);
  const nextQuestion = useSocialStore((s) => s.nextQuestion);
  const endQuiz = useSocialStore((s) => s.endQuiz);

  if (!session) return null;
  const currentQuestion = session.questions[session.currentIndex];
  const isLast = session.currentIndex === session.questions.length - 1;
  const currentScore = session.answers.reduce((sum, a) => sum + a.points, 0);

  if (!currentQuestion) {
    return (
      <EmptyState
        title="No questions available"
        description="This category or daily challenge has no questions yet."
      />
    );
  }

  // When the user clicks "See Results" on the last question:
  //   1. We mark the session as `finished: true` so the QuizView re-renders
  //      to show the ResultsScreen.
  //   2. The ResultsScreen's useEffect calls endQuiz() which submits to
  //      the server. While waiting, it shows a "Submitting…" spinner.
  function handleFinish() {
    if (session && session.currentIndex === session.questions.length - 1) {
      // Mark as finished — the results screen will pick it up.
      useSocialStore.setState((s) => ({
        quizSession: s.quizSession ? { ...s.quizSession, finished: true } : null,
      }));
    } else {
      nextQuestion();
    }
  }

  return (
    <QuestionCard
      key={currentQuestion.id}
      question={currentQuestion as never}
      questionNumber={session.currentIndex + 1}
      totalQuestions={session.questions.length}
      currentScore={currentScore}
      onNext={nextQuestion}
      onFinish={handleFinish}
      isLast={isLast}
    />
  );
}

/** Results screen rendered inline when the session is finished. */
function ResultsScreenInline() {
  const session = useSocialStore((s) => s.quizSession);
  const exitQuiz = useSocialStore((s) => s.exitQuiz);
  const setQuizTab = useSocialStore((s) => s.setQuizTab);
  const startCategoryQuiz = useSocialStore((s) => s.startCategoryQuiz);
  const startDailyQuiz = useSocialStore((s) => s.startDailyQuiz);

  if (!session) return null;

  async function handlePlayAgain() {
    if (!session) return;
    if (session.type === 'category') {
      await startCategoryQuiz(session.refId);
    } else {
      // If the daily was already completed today, the server will reject
      // a re-submit. We exit instead.
      const daily = useSocialStore.getState().dailyToday;
      if (daily?.hasCompletedToday) {
        exitQuiz();
        setQuizTab('play');
        return;
      }
      await startDailyQuiz();
    }
  }

  function handleBackToLanding() {
    exitQuiz();
    setQuizTab('play');
  }

  return (
    <ResultsScreen onPlayAgain={handlePlayAgain} onBackToLanding={handleBackToLanding} />
  );
}

function QuizHeader() {
  const quizLanguage = useSocialStore((s) => s.quizLanguage);
  const setQuizLanguage = useSocialStore((s) => s.setQuizLanguage);
  const userAttempts = useSocialStore((s) => s.quizAttempts);
  const totalPoints = userAttempts.reduce((sum, a) => sum + a.totalPoints, 0);
  const streak = useSocialStore((s) => s.quizStreakDays);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-gradient-to-r from-navy-soft/50 via-background to-saffron-soft/30 backdrop-blur">
      <div className="px-4 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white shadow-soft">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                India Quiz
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Test your knowledge · earn badges · climb the board
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Streak chip */}
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                <Flame className="h-3 w-3" />
                {streak}d
              </span>
            )}
            {/* Points chip */}
            {totalPoints > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-saffron-soft px-2 py-0.5 text-xs font-medium text-saffron">
                <Trophy className="h-3 w-3" />
                {formatCount(totalPoints)} pts
              </span>
            )}
            {/* Language picker */}
            <LanguagePicker value={quizLanguage} onChange={setQuizLanguage} />
          </div>
        </div>
      </div>
    </header>
  );
}

function LanguagePicker({
  value,
  onChange,
}: {
  value: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <div
      className="flex items-center rounded-full bg-card p-0.5 ring-1 ring-border"
      role="group"
      aria-label="Quiz language"
    >
      {QUIZ_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => onChange(lang)}
          aria-pressed={value === lang}
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
            value === lang
              ? 'bg-saffron text-white'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {languageLabel(lang)}
        </button>
      ))}
    </div>
  );
}

function QuizTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: QuizTab;
  onTabChange: (t: QuizTab) => void;
}) {
  return (
    <div role="tablist" aria-label="India Quiz sections" className="flex border-b border-border">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = activeTab === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(key)}
            className="group relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <Icon className={cn('h-4 w-4', active ? 'text-saffron' : 'text-white/50')} />
            <span className={cn(active ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            <span
              className={cn(
                'absolute inset-x-0 -bottom-px h-[3px] bg-saffron transition-transform',
                active ? 'scale-x-100' : 'scale-x-0',
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

/** Play tab — shows category grid + daily challenge shortcut. */
function PlayPanel() {
  const startCategoryQuiz = useSocialStore((s) => s.startCategoryQuiz);
  const setQuizTab = useSocialStore((s) => s.setQuizTab);
  const startDailyQuiz = useSocialStore((s) => s.startDailyQuiz);
  const dailyCompletedDates = useSocialStore((s) => s.dailyCompletedDates);
  const dailyToday = useSocialStore((s) => s.dailyToday);
  const quizLanguage = useSocialStore((s) => s.quizLanguage);
  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const { toast } = useToast();

  const todayCompleted = dailyToday?.hasCompletedToday || dailyCompletedDates.has(dailyToday?.date || '');

  async function handleStartCategory(categoryId: string) {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    setStarting(categoryId);
    const ok = await startCategoryQuiz(categoryId);
    setStarting(null);
    if (!ok) {
      toast({
        title: 'No questions available',
        description: 'This category doesn\'t have any published questions yet.',
        variant: 'destructive',
      });
    }
  }

  async function handleStartDaily() {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    if (todayCompleted) {
      toast({
        title: 'Already completed today',
        description: 'You\'ve already finished today\'s Daily Challenge. Come back tomorrow for a new set!',
      });
      return;
    }
    setStarting('daily');
    const ok = await startDailyQuiz();
    setStarting(null);
    if (!ok) {
      toast({
        title: 'Daily challenge unavailable',
        description: 'No questions are available for today\'s challenge. Please try again later.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Daily challenge hero card */}
      <button
        type="button"
        onClick={handleStartDaily}
        disabled={starting === 'daily'}
        className={cn(
          'flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all',
          todayCompleted
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-saffron/30 bg-gradient-to-br from-saffron-soft/50 to-navy-soft/30 hover:-translate-y-0.5 hover:shadow-soft-md',
          starting === 'daily' && 'opacity-60',
        )}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-white shadow-soft">
          {starting === 'daily' ? <Loader2 className="h-6 w-6 animate-spin" /> : <Calendar className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {todayCompleted ? 'Daily Challenge Complete' : 'Today\'s Daily Challenge'}
          </p>
          <p className="text-xs text-muted-foreground">
            {dailyToday?.questionIds?.length || 5} questions ·{' '}
            {todayCompleted ? 'See your results below' : 'Play now to earn bonus points'}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Real-data notice */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-xs text-emerald-800">
        ✓ Real question bank — {0} questions across {QUIZ_CATEGORIES.length} categories. Answers verified server-side.
      </div>

      {/* Category grid */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Choose a category</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {QUIZ_CATEGORIES.map((cat) => {
            const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[cat.icon] ?? Brain;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleStartCategory(cat.id)}
                disabled={starting !== null}
                className={cn(
                  'group flex flex-col gap-2 rounded-2xl border border-border p-3 text-left transition-all',
                  'hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  starting === cat.id && 'opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                    cat.gradient,
                  )}
                >
                  {starting === cat.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                </span>
                <span className="text-sm font-semibold leading-snug text-foreground">
                  {getCategoryLabel(cat, quizLanguage)}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground line-clamp-2">
                  {cat.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode="login" />
    </div>
  );
}

/** Daily tab — shows daily challenge history and completion state. */
function DailyPanel() {
  const startDailyQuiz = useSocialStore((s) => s.startDailyQuiz);
  const dailyCompletedDates = useSocialStore((s) => s.dailyCompletedDates);
  const dailyToday = useSocialStore((s) => s.dailyToday);
  const quizAttempts = useSocialStore((s) => s.quizAttempts);
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);

  const todayCompleted = dailyToday?.hasCompletedToday || dailyCompletedDates.has(dailyToday?.date || '');

  async function handleStartDaily() {
    if (todayCompleted) {
      toast({
        title: 'Already completed today',
        description: 'You\'ve already finished today\'s Daily Challenge. Come back tomorrow!',
      });
      return;
    }
    setStarting(true);
    const ok = await startDailyQuiz();
    setStarting(false);
    if (!ok) {
      toast({
        title: 'Daily challenge unavailable',
        description: 'No questions are available for today. Please try again later.',
        variant: 'destructive',
      });
    }
  }

  // Find the user's score for today's challenge if completed.
  const todayAttempt = quizAttempts.find(
    (a) => a.type === 'daily' && a.refId === dailyToday?.date,
  );

  return (
    <div className="space-y-4 p-4">
      {/* Today's challenge card */}
      <div className="rounded-2xl border border-saffron/30 bg-gradient-to-br from-saffron-soft/40 to-navy-soft/30 p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-saffron" />
          <h2 className="text-base font-semibold text-foreground">
            {dailyToday?.title || 'Today\'s Daily Challenge'}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {dailyToday?.questionIds?.length || 5} questions · Date: {dailyToday?.date || '—'}
        </p>

        {todayCompleted && todayAttempt ? (
          <div className="mt-3 rounded-xl bg-card p-3">
            <p className="text-sm font-medium text-foreground">
              ✅ Completed!
            </p>
            <p className="text-xs text-muted-foreground">
              Score: {todayAttempt.totalPoints} points ·{' '}
              {todayAttempt.correctCount}/{todayAttempt.totalQuestions} correct
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartDaily}
            disabled={starting}
            className="mt-3 flex items-center gap-2 rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {starting ? 'Loading…' : 'Start Today\'s Challenge'}
          </button>
        )}
      </div>

      {/* Recent attempts */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Recent attempts</h3>
        <div className="space-y-2">
          {quizAttempts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No attempts yet — play your first quiz to see your history here.</p>
          ) : (
            quizAttempts.slice(0, 5).map((a) => (
              <DailyHistoryRow
                key={a.id}
                date={a.refId}
                title={a.type === 'daily' ? `Daily Challenge — ${a.refId}` : `Category quiz — ${a.refId}`}
                completed
                score={a.totalPoints}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DailyHistoryRow({
  date,
  title,
  completed,
  score,
}: {
  date: string;
  title: string;
  completed: boolean;
  score?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
      {completed ? (
        <span className="text-xs font-medium text-emerald-600">
          {score ?? 0} pts
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Not played</span>
      )}
    </div>
  );
}
