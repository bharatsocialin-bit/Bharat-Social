'use client';

import { useEffect, useState } from 'react';
import { Check, X, RotateCcw, Trophy, ArrowLeft, Share2, Loader2, Award, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { useToast } from '@/hooks/use-toast';
import {
  getQuestionText,
  getOptionText,
  getExplanationText,
  getCategoryLabel,
} from '@/lib/quiz-i18n';
import { QUIZ_CATEGORY_MAP } from '@/data/quiz-categories';
import type { Language } from '@/lib/types';

interface ResultsScreenProps {
  onPlayAgain: () => void;
  onBackToLanding: () => void;
}

interface GradedAnswer {
  questionId: string;
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
  correct: boolean;
  points: number;
  timeTakenSeconds: number;
}

interface ServerResult {
  attemptId: string;
  totalPoints: number;
  correctCount: number;
  totalQuestions: number;
  gradedAnswers: GradedAnswer[];
  newlyAwardedAchievements: string[];
}

interface QuestionDetail {
  id: string;
  text: string;
  translations?: Record<string, string>;
  options: Array<{ id: string; text: string; translations?: Record<string, string> }>;
  explanation: string;
  explanationTranslations?: Record<string, string>;
  source?: string | null;
}

/**
 * Results screen — shown when the in-progress quiz session has finished.
 *
 * Behaviour:
 *   - On mount, calls endQuiz() which POSTs the answers to /api/quiz/attempts.
 *   - While waiting, shows a spinner ("Submitting…").
 *   - Once the server responds with the graded result, reveals the score,
 *     the correct/incorrect status for each question, and the explanation.
 *   - Shows newly-awarded achievements.
 */
export function ResultsScreen({ onPlayAgain, onBackToLanding }: ResultsScreenProps) {
  const quizLanguage = useSocialStore((s) => s.quizLanguage);
  const session = useSocialStore((s) => s.quizSession);
  const endQuiz = useSocialStore((s) => s.endQuiz);
  const personalBest = useSocialStore((s) =>
    s.quizAttempts
      .filter((a) => session && a.type === session.type && a.refId === session.refId)
      .reduce((max, a) => Math.max(max, a.totalPoints), 0),
  );
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(true);
  const [serverResult, setServerResult] = useState<ServerResult | null>(null);
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Submit the quiz attempt on mount + on retry.
  useEffect(() => {
    let cancelled = false;
    async function submit() {
      if (!session) return;
      setSubmitting(true);
      setSubmitError(null);
      await endQuiz();
      if (cancelled) return;
      // After endQuiz, the store updates the session with `serverResult`
      // or `submitError`.
      const updatedSession = useSocialStore.getState().quizSession;
      if (updatedSession?.serverResult) {
        setServerResult(updatedSession.serverResult);
        setQuestions(updatedSession.questions as unknown as QuestionDetail[]);
        // Show newly-awarded achievements as a toast.
        if (updatedSession.serverResult.newlyAwardedAchievements.length > 0) {
          toast({
            title: 'Achievement unlocked!',
            description: `You earned: ${updatedSession.serverResult.newlyAwardedAchievements.join(', ')}`,
          });
        }
        setSubmitError(null);
      } else if (updatedSession?.submitError) {
        setSubmitError(updatedSession.submitError);
      }
      setSubmitting(false);
    }
    submit();
    return () => { cancelled = true; };
  }, [retryCount]);

  // ── Error state with retry ──
  if (!submitting && submitError) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-rose-400" />
        <h2 className="text-lg font-semibold text-white">Submission failed</h2>
        <p className="max-w-sm text-center text-sm text-muted-foreground">{submitError}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBackToLanding}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
          >
            Back to Quiz
          </button>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="flex items-center gap-1.5 rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
          >
            <RotateCcw className="h-4 w-4" />
            Retry submission
          </button>
        </div>
      </div>
    );
  }

  if (submitting || !serverResult || !session) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-saffron" />
        <p className="text-sm text-muted-foreground">Submitting your answers…</p>
      </div>
    );
  }

  const totalPoints = serverResult.totalPoints;
  const correctCount = serverResult.correctCount;
  const totalQuestions = serverResult.totalQuestions;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const isPersonalBest = totalPoints >= personalBest && totalPoints > 0;

  const category = session.type === 'category' ? QUIZ_CATEGORY_MAP[session.refId] : null;
  const title =
    session.type === 'daily'
      ? 'Daily Challenge Results'
      : category
        ? `${getCategoryLabel(category, quizLanguage as Language)} — Results`
        : 'Quiz Results';

  function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const text = `I scored ${totalPoints} points on BharatSocial India Quiz (${correctCount}/${totalQuestions} correct, ${accuracy}% accuracy). Play at BharatSocial.in!`;
      navigator.clipboard.writeText(text).catch(() => {});
    }
    toast({
      title: 'Result copied to clipboard',
      description: 'Share your score with friends.',
    });
  }

  // Encouraging message based on accuracy.
  let message: string;
  let messageGradient: string;
  if (accuracy === 100) {
    message = 'Perfect score! Outstanding work.';
    messageGradient = 'from-emerald-500 to-teal-600';
  } else if (accuracy >= 75) {
    message = 'Great job! Almost there.';
    messageGradient = 'from-teal-500 to-emerald-600';
  } else if (accuracy >= 50) {
    message = 'Good effort — keep practising!';
    messageGradient = 'from-amber-500 to-orange-600';
  } else {
    message = 'Every quiz is a chance to learn. Try again!';
    messageGradient = 'from-saffron to-amber-600';
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header banner */}
      <div className={cn('bg-gradient-to-br p-6 text-center text-white', messageGradient)}>
        <Trophy className="mx-auto h-12 w-12" />
        <h1 className="mt-2 text-2xl font-bold">{title}</h1>
        {isPersonalBest && (
          <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-sm">
            New personal best!
          </span>
        )}
        <p className="mt-1 text-sm text-white/80">{message}</p>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <StatCard label="Score" value={totalPoints.toString()} accent="text-brand" />
        <StatCard label="Correct" value={`${correctCount}/${totalQuestions}`} accent="text-emerald-600" />
        <StatCard label="Accuracy" value={`${accuracy}%`} accent="text-saffron" />
      </div>

      {personalBest > 0 && (
        <div className="px-4 pb-2 text-center text-xs text-muted-foreground">
          Personal best for this {session.type === 'daily' ? 'daily challenge' : 'category'}: {personalBest} points
        </div>
      )}

      {/* Newly-awarded achievements banner */}
      {serverResult.newlyAwardedAchievements.length > 0 && (
        <div className="mx-4 mb-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">
              {serverResult.newlyAwardedAchievements.length} new achievement{serverResult.newlyAwardedAchievements.length === 1 ? '' : 's'} unlocked!
            </p>
          </div>
          <ul className="mt-2 space-y-1 text-xs text-amber-800">
            {serverResult.newlyAwardedAchievements.map((slug) => (
              <li key={slug} className="capitalize">• {slug.replace(/-/g, ' ')}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" />
          Play Again
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {/* Question-by-question review — uses the SERVER's graded answers */}
      <div className="border-t border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Answer Review</h2>
        <ol className="space-y-3">
          {questions.map((q, idx) => {
            const graded = serverResult.gradedAnswers.find((a) => a.questionId === q.id);
            if (!graded) return null;
            const correct = graded.correct;
            const timedOut = graded.selectedOptionIndex === null;
            const userOption = graded.selectedOptionIndex !== null ? q.options[graded.selectedOptionIndex] : null;
            const correctOption = q.options[graded.correctOptionIndex];

            return (
              <li
                key={q.id}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      correct
                        ? 'bg-emerald-100 text-emerald-700'
                        : timedOut
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700',
                    )}
                  >
                    {correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {idx + 1}. {getQuestionText(q as never, quizLanguage as Language)}
                    </p>
                    {!correct && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timedOut
                          ? 'Time ran out. '
                          : userOption
                            ? `Your answer: ${getOptionText(userOption as never, quizLanguage as Language)}. `
                            : 'No answer submitted. '}
                        <span className="font-medium text-emerald-700">
                          Correct: {correctOption ? getOptionText(correctOption as never, quizLanguage as Language) : '—'}
                        </span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-foreground/70">
                      {getExplanationText(q as never, quizLanguage as Language)}
                    </p>
                    {q.source && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Source: {q.source}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Back to quiz landing */}
      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to India Quiz
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className={cn('text-xl font-bold', accent)}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
