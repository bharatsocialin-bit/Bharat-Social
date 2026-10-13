'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Clock, ChevronRight, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuizQuestion, Language } from '@/lib/types';
import { useSocialStore } from '@/store/useSocialStore';
import {
  getQuestionText,
  getOptionText,
  getExplanationText,
} from '@/lib/quiz-i18n';
import { languageLabel } from '@/lib/format';

interface QuestionCardProps {
  question: QuizQuestion;
  /** 1-indexed question number for display. */
  questionNumber: number;
  totalQuestions: number;
  /** Current score so far (before this question). */
  currentScore: number;
  onNext: () => void;
  onFinish: () => void;
  /** Whether this is the last question. */
  isLast: boolean;
}

/**
 * Renders one multiple-choice question at a time.
 *
 * CRITICAL SECURITY BEHAVIOUR:
 *   - The correct answer is NOT known to the client.
 *   - When the user selects an option, we record the SELECTED OPTION INDEX
 *     locally — we do NOT show "Correct!" / "Incorrect" feedback because
 *     we can't know that without asking the server.
 *   - Instead, we show "Answer submitted. Continue to see the result."
 *   - The actual correct/incorrect reveal happens in the ResultsScreen
 *     AFTER the attempt is submitted to the server.
 *
 * Behaviour:
 *   - Four answer options, keyboard-accessible (1-4 or arrow keys).
 *   - Once an answer is selected, it is locked — no re-answering.
 *   - Optional countdown timer per question; when time runs out, the
 *     question is marked unanswered (selectedOptionIndex = null).
 */
export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  currentScore,
  onNext,
  onFinish,
  isLast,
}: QuestionCardProps) {
  const quizLanguage = useSocialStore((s) => s.quizLanguage);
  const submitAnswer = useSocialStore((s) => s.submitAnswer);
  const session = useSocialStore((s) => s.quizSession);

  // Find this question's answer in the session (if already submitted).
  const existingAnswer = session?.answers.find((a) => a.questionId === question.id);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    existingAnswer?.selectedOptionIndex ?? null,
  );

  // Timer state.
  const timeLimit = question.timeLimitSeconds ?? 0;
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const answered = existingAnswer !== undefined || selectedOptionIndex !== null;

  // Start the countdown timer when the question mounts.
  const startTimer = useCallback(() => {
    if (timeLimit <= 0) return;
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        // Time's up — mark as unanswered if not already answered.
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        const currentSession = useSocialStore.getState().quizSession;
        const already = currentSession?.answers.find((a) => a.questionId === question.id);
        if (!already) {
          // Submit with a null index — server will mark as incorrect.
          submitAnswer(question.id, null, Math.round(timeLimit));
        }
      }
    }, 200);
  }, [timeLimit, question.id, submitAnswer]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [startTimer, question.id]);

  function handleSelect(optionIndex: number) {
    if (answered) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    setSelectedOptionIndex(optionIndex);
    submitAnswer(question.id, optionIndex, timeTaken);
  }

  function handleNext() {
    if (!answered) return;
    if (isLast) {
      onFinish();
    } else {
      onNext();
    }
  }

  // Keyboard interaction: 1-4 to select, Enter for next.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!answered) {
        if (e.key >= '1' && e.key <= '4') {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < question.options.length) {
            handleSelect(idx);
          }
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, question, handleSelect, handleNext]);

  const timedOut = existingAnswer?.selectedOptionIndex === null && existingAnswer !== undefined;

  // Determine option styling — note: we DON'T highlight correct/incorrect
  // because we don't know the correct answer until after submit.
  function getOptionClasses(optionIndex: number): string {
    if (!answered) {
      return cn(
        'border-border bg-card text-white hover:border-saffron hover:bg-saffron-soft/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      );
    }
    // Post-answer: highlight the user's selection; no correct/incorrect colors.
    if (optionIndex === selectedOptionIndex) {
      return 'border-saffron bg-saffron-soft/40 text-white';
    }
    return 'border-border bg-card text-muted-foreground opacity-60';
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Progress bar */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-muted-foreground">
            Score: <span className="font-semibold text-saffron">{currentScore}</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-saffron transition-[width] duration-300"
            style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%` }}
            role="progressbar"
            aria-valuenow={questionNumber}
            aria-valuemin={0}
            aria-valuemax={totalQuestions}
          />
        </div>
      </div>

      {/* Question + options */}
      <div className="flex-1 p-4">
        {/* Timer */}
        {timeLimit > 0 && (
          <div className="mb-3 flex items-center justify-end">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                timeLeft <= 5
                  ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  : 'bg-secondary text-secondary-foreground',
              )}
            >
              <Clock className="h-3 w-3" />
              {Math.ceil(timeLeft)}s
            </span>
          </div>
        )}

        {/* Language chip for non-English */}
        {quizLanguage !== 'en' && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-saffron-soft px-2 py-0.5 text-[11px] font-medium text-saffron">
              {languageLabel(quizLanguage as Parameters<typeof languageLabel>[0])}
            </span>
          </div>
        )}

        {/* Question text */}
        <h2 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
          {getQuestionText(question, quizLanguage)}
        </h2>

        {/* Options */}
        <div className="mt-4 space-y-2.5">
          {question.options.map((option, idx) => {
            const isThisSelected = idx === selectedOptionIndex;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                  getOptionClasses(idx),
                  !answered && 'active:scale-[0.99]',
                )}
                aria-label={`Option ${idx + 1}: ${getOptionText(option, quizLanguage)}`}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    answered && isThisSelected
                      ? 'bg-saffron text-white'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {answered && isThisSelected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + idx) // A, B, C, D
                  )}
                </span>
                <span className="flex-1 text-sm font-medium sm:text-base">
                  {getOptionText(option, quizLanguage)}
                </span>
              </button>
            );
          })}
        </div>

        {/* "Answer submitted" notice — we do NOT reveal correctness yet */}
        {answered && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-center gap-2">
              {timedOut ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">Time&apos;s up — no answer recorded</span>
                </>
              ) : (
                <>
                  <HelpCircle className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-900">Answer submitted</span>
                </>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              {timedOut
                ? 'You ran out of time on this question. Continue to the next one — your final score will be calculated when you finish the quiz.'
                : 'Your selection is locked in. We\'ll reveal whether you were correct — along with the full explanation — once you finish the quiz.'}
            </p>
          </div>
        )}
      </div>

      {/* Next / Finish button */}
      <div className="border-t border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={!answered}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all',
            answered
              ? 'bg-saffron text-white hover:brightness-105 active:scale-[0.98]'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          {isLast ? 'See Results' : 'Next Question'}
          <ChevronRight className="h-4 w-4" />
        </button>
        {!answered && (
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Press 1–4 to select an answer, or Enter to continue after answering.
          </p>
        )}
      </div>
    </div>
  );
}
