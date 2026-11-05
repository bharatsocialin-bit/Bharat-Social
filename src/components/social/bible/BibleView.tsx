'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flame, BookOpen, BookMarked, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { BibleReader } from './BibleReader';
import { BibleTranslationPicker } from './BibleTranslationPicker';
import { BibleBookPicker } from './BibleBookPicker';
import { getBook, type BibleBook } from '@/lib/bible/books';
import { TRANSLATIONS, DEFAULT_TRANSLATION_ID, type BibleTranslation } from '@/lib/bible/translations';

// ── LocalStorage keys for user preferences (anonymous users too) ──
const LS_TRANSLATION = 'lordsbook-bible-translation';
const LS_BOOK = 'lordsbook-bible-book';
const LS_CHAPTER = 'lordsbook-bible-chapter';

function loadTranslation(): string {
  if (typeof window === 'undefined') return DEFAULT_TRANSLATION_ID;
  try {
    const stored = localStorage.getItem(LS_TRANSLATION);
    if (stored && TRANSLATIONS.some((t) => t.id === stored)) return stored;
  } catch {}
  return DEFAULT_TRANSLATION_ID;
}

function loadBook(): string {
  if (typeof window === 'undefined') return 'GEN';
  try {
    const stored = localStorage.getItem(LS_BOOK);
    if (stored && getBook(stored)) return stored;
  } catch {}
  return 'GEN';
}

function loadChapter(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const stored = parseInt(localStorage.getItem(LS_CHAPTER) ?? '1', 10);
    if (Number.isFinite(stored) && stored >= 1) return stored;
  } catch {}
  return 1;
}

// ── Streak display ─────────────────────────────────────────────────────────

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalReadDays: number;
  readToday: boolean;
}

export function BibleView() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [translationId, setTranslationId] = useState<string>(loadTranslation);
  const [bookUsfm, setBookUsfm] = useState<string>(loadBook);
  const [chapter, setChapter] = useState<number>(loadChapter);
  const [translationPickerOpen, setTranslationPickerOpen] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [streak, setStreak] = useState<StreakData | null>(null);

  // ── Load streak for authenticated users ──
  // Streak is null for anonymous users (no setState in effect needed —
  // `streak` initial state is already null and only changes when an
  // authenticated user's data loads).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetch('/api/bible/streak')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: StreakData) => {
        if (!cancelled) setStreak(data);
      })
      .catch(() => {
        // Non-fatal.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Reset streak to null when the user signs out (state-derived, no effect needed).
  const effectiveStreak = isAuthenticated ? streak : null;

  // ── Persist preferences ──
  useEffect(() => {
    try { localStorage.setItem(LS_TRANSLATION, translationId); } catch {}
  }, [translationId]);
  useEffect(() => {
    try { localStorage.setItem(LS_BOOK, bookUsfm); } catch {}
  }, [bookUsfm]);
  useEffect(() => {
    try { localStorage.setItem(LS_CHAPTER, String(chapter)); } catch {}
  }, [chapter]);

  // ── Navigation handler ──
  const handleNavigate = useCallback((trans: string, book: string, ch: number) => {
    setTranslationId(trans);
    setBookUsfm(book.toUpperCase());
    setChapter(ch);
  }, []);

  // ── Translation picker handler ──
  const handleSelectTranslation = useCallback((t: BibleTranslation) => {
    setTranslationId(t.id);
    toast({
      title: 'Translation changed',
      description: `Now reading the ${t.name}.`,
    });
  }, [toast]);

  // ── Book picker handler ──
  const handleSelectBookChapter = useCallback((book: BibleBook, ch: number) => {
    setBookUsfm(book.usfm);
    setChapter(ch);
  }, []);

  const currentTranslation = TRANSLATIONS.find((t) => t.id === translationId);
  const currentBook = getBook(bookUsfm);

  return (
    <div className="min-h-full">
      {/* Header — Bible title + streak */}
      <div className="border-b border-border bg-card/50 px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-xl font-bold text-white">
                <BookOpen className="h-5 w-5 text-saffron" />
                Bible
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {currentTranslation?.name ?? translationId} · {currentBook?.name ?? 'Unknown'} {chapter}
              </p>
            </div>

            {/* Streak badge — only for authenticated users */}
            {isAuthenticated && effectiveStreak && (
              <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Flame
                    className={cn(
                      'h-4 w-4',
                      effectiveStreak.currentStreak > 0 ? 'text-saffron' : 'text-muted-foreground',
                    )}
                  />
                  <div>
                    <p className="text-sm font-bold text-white">{effectiveStreak.currentStreak}</p>
                    <p className="text-[10px] text-muted-foreground">day streak</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-sm font-bold text-white">{effectiveStreak.totalReadDays}</p>
                  <p className="text-[10px] text-muted-foreground">total days</p>
                </div>
                {effectiveStreak.readToday ? (
                  <span className="rounded-full bg-india-green/20 px-2 py-0.5 text-[10px] font-semibold text-india-green">
                    ✓ Today
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Not today
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reader */}
      <BibleReader
        translationId={translationId}
        bookUsfm={bookUsfm}
        chapter={chapter}
        onNavigate={handleNavigate}
        onOpenBookPicker={() => setBookPickerOpen(true)}
        onOpenTranslationPicker={() => setTranslationPickerOpen(true)}
      />

      {/* Translation picker */}
      <BibleTranslationPicker
        open={translationPickerOpen}
        onOpenChange={setTranslationPickerOpen}
        currentTranslationId={translationId}
        onSelect={handleSelectTranslation}
      />

      {/* Book picker */}
      <BibleBookPicker
        open={bookPickerOpen}
        onOpenChange={setBookPickerOpen}
        currentBook={bookUsfm}
        onSelect={handleSelectBookChapter}
      />
    </div>
  );
}
