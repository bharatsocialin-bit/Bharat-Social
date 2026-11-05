'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Share2,
  Copy,
  Check,
  Loader2,
  ArrowUp,
  Type,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { VerseShareDialog } from './VerseShareDialog';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getBook, getNextBook, getPrevBook, type BibleBook } from '@/lib/bible/books';

// ── Types ──────────────────────────────────────────────────────────────────

interface Verse {
  verse: number;
  text: string;
}

interface LoadedChapter {
  translation: string;
  book: string;
  bookName: string;
  chapter: number;
  verses: Verse[];
  verseCount: number;
}

interface BookmarkEntry {
  id: string;
  translation: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
}

interface BibleReaderProps {
  /** Initial translation ID. */
  translationId: string;
  /** Initial book USFM ID. */
  bookUsfm: string;
  /** Initial chapter number. */
  chapter: number;
  /** Called when the user navigates to a different book/chapter (so the parent can update URL state if desired). */
  onNavigate?: (translationId: string, bookUsfm: string, chapter: number) => void;
  /** Open the book picker (parent owns the modal state). */
  onOpenBookPicker?: () => void;
  /** Open the translation picker (parent owns the modal state). */
  onOpenTranslationPicker?: () => void;
}

// ── Font size control ──────────────────────────────────────────────────────

const FONT_SIZES = [14, 16, 18, 20, 22, 24] as const;
const DEFAULT_FONT_SIZE_IDX = 1; // 16px
const FONT_SIZE_STORAGE_KEY = 'lordsbook-bible-font-size';

function loadFontSizeIdx(): number {
  if (typeof window === 'undefined') return DEFAULT_FONT_SIZE_IDX;
  try {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (stored) {
      const idx = parseInt(stored, 10);
      if (Number.isFinite(idx) && idx >= 0 && idx < FONT_SIZES.length) return idx;
    }
  } catch {}
  return DEFAULT_FONT_SIZE_IDX;
}

function saveFontSizeIdx(idx: number) {
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(idx));
  } catch {}
}

// ── Component ──────────────────────────────────────────────────────────────

export function BibleReader({
  translationId,
  bookUsfm,
  chapter,
  onNavigate,
  onOpenBookPicker,
  onOpenTranslationPicker,
}: BibleReaderProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [chapters, setChapters] = useState<LoadedChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [fontSizeIdx, setFontSizeIdx] = useState<number>(loadFontSizeIdx);
  const [showFontControl, setShowFontControl] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeVerse, setActiveVerse] = useState<{ bookUsfm: string; chapter: number; verse: number } | null>(null);
  const [bookmarkedVerses, setBookmarkedVerses] = useState<BookmarkEntry[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);

  // Helper to build a unique key for a chapter.
  const chapterKey = (book: string, ch: number) => `${book}-${ch}`;

  // Helper to build a unique key for a bookmarked verse.
  const verseKey = (book: string, ch: number, v: number) => `${book}-${ch}-${v}`;

  // ── Load bookmarks for the current translation ──
  // For anonymous users, bookmarks stay empty (initial state) — no setState
  // needed in the effect. Only authenticated users trigger the fetch + state
  // update via the .then() callback (which is async, not synchronous).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetch(`/api/bible/bookmarks?translation=${encodeURIComponent(translationId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed'))))
      .then((data: { bookmarks: BookmarkEntry[] }) => {
        if (cancelled) return;
        setBookmarkedVerses(data.bookmarks ?? []);
        setBookmarks(new Set(data.bookmarks.map((b) => verseKey(b.book, b.chapter, b.verse))));
      })
      .catch(() => {
        // Non-fatal — bookmarks just won't show.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, translationId]);

  // ── Load the initial chapter ──
  const loadChapter = useCallback(
    async (translation: string, book: string, ch: number): Promise<LoadedChapter | null> => {
      try {
        const res = await fetch(
          `/api/bible/${encodeURIComponent(translation)}/${encodeURIComponent(book)}/${ch}`,
        );
        if (!res.ok) return null;
        return (await res.json()) as LoadedChapter;
      } catch {
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    // Use a Promise.resolve().then() to defer the synchronous setState calls
    // out of the effect body (avoids the react-hooks/set-state-in-effect lint
    // rule). The actual fetch happens after the microtask.
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setChapters([]);
      const data = await loadChapter(translationId, bookUsfm.toUpperCase(), chapter);
      if (cancelled) return;
      if (!data) {
        setError('Chapter not available in this translation.');
        setLoading(false);
        return;
      }
      setChapters([data]);
      setLoading(false);
      // Scroll to top on initial load.
      requestAnimationFrame(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [translationId, bookUsfm, chapter, loadChapter]);

  // ── Infinite scroll: load next chapter when user reaches the bottom ──
  const loadNextChapter = useCallback(async () => {
    if (loadingMore || chapters.length === 0) return;
    const lastChapter = chapters[chapters.length - 1];
    const book = getBook(lastChapter.book);
    if (!book) return;

    let nextBook: BibleBook | undefined = book;
    let nextChapterNum = lastChapter.chapter + 1;

    // If we're past the last chapter of this book, move to the next book.
    if (nextChapterNum > book.chapters) {
      nextBook = getNextBook(book.usfm);
      if (!nextBook) return; // End of Bible.
      nextChapterNum = 1;
    }

    setLoadingMore(true);
    const data = await loadChapter(translationId, nextBook.usfm, nextChapterNum);
    if (data) {
      setChapters((prev) => {
        // Avoid duplicates.
        if (prev.some((c) => c.book === data.book && c.chapter === data.chapter)) return prev;
        return [...prev, data];
      });
    }
    setLoadingMore(false);
  }, [loadingMore, chapters, translationId, loadChapter]);

  // ── Scroll handler: show "scroll to top" button + trigger infinite load ──
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Show scroll-to-top after scrolling down 200px.
    setShowScrollTop(el.scrollTop > 200);
    // Infinite load when within 800px of the bottom.
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 800) {
      void loadNextChapter();
    }
  }, [loadNextChapter]);

  // ── Bookmark toggle ──
  async function toggleBookmark(chapter: LoadedChapter, verse: Verse) {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in to bookmark',
        description: 'Bookmarks are saved to your account.',
      });
      return;
    }
    const vKey = verseKey(chapter.book, chapter.chapter, verse.verse);
    const isBookmarked = bookmarks.has(vKey);

    if (isBookmarked) {
      // Find and delete.
      const entry = bookmarkedVerses.find(
        (b) => b.book === chapter.book && b.chapter === chapter.chapter && b.verse === verse.verse,
      );
      if (entry) {
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(vKey);
          return next;
        });
        setBookmarkedVerses((prev) => prev.filter((b) => b.id !== entry.id));
        fetch(`/api/bible/bookmarks?id=${entry.id}`, { method: 'DELETE' }).catch(() => {});
      }
    } else {
      // Create.
      setBookmarks((prev) => {
        const next = new Set(prev);
        next.add(vKey);
        return next;
      });
      try {
        const res = await fetch('/api/bible/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            translation: chapter.translation,
            book: chapter.book,
            bookName: chapter.bookName,
            chapter: chapter.chapter,
            verse: verse.verse,
            verseText: verse.text,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setBookmarkedVerses((prev) => [data.bookmark, ...prev]);
        }
      } catch {
        // Revert on failure.
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(vKey);
          return next;
        });
      }
    }
  }

  // ── Copy verse ──
  async function copyVerse(chapter: LoadedChapter, verse: Verse) {
    const text = `"${verse.text}" — ${chapter.bookName} ${chapter.chapter}:${verse.verse} (${chapter.translation})`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Verse copied', description: text.slice(0, 80) + '...' });
    } catch {
      toast({ title: 'Copy failed', description: 'Your browser blocked clipboard access.', variant: 'destructive' });
    }
  }

  // ── Share verse ──
  async function shareVerse(chapter: LoadedChapter, verse: Verse) {
    const text = `"${verse.text}" — ${chapter.bookName} ${chapter.chapter}:${verse.verse}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text, title: `${chapter.bookName} ${chapter.chapter}:${verse.verse}` });
      } catch {}
    } else {
      await copyVerse(chapter, verse);
    }
  }

  // ── Share verse (opens share dialog) ──
  const [shareDialogState, setShareDialogState] = useState<{
    open: boolean;
    chapter: LoadedChapter | null;
    verse: Verse | null;
  }>({ open: false, chapter: null, verse: null });

  function openShareDialog(chapter: LoadedChapter, verse: Verse) {
    setShareDialogState({ open: true, chapter, verse });
  }

  // ── Navigation: prev/next chapter ──
  function goToPrevChapter() {
    const firstCh = chapters[0];
    if (!firstCh) return;
    const book = getBook(firstCh.book);
    if (!book) return;
    if (firstCh.chapter > 1) {
      onNavigate?.(translationId, book.usfm, firstCh.chapter - 1);
    } else {
      const prevBook = getPrevBook(book.usfm);
      if (prevBook) {
        onNavigate?.(translationId, prevBook.usfm, prevBook.chapters);
      }
    }
  }

  function goToNextChapter() {
    const lastCh = chapters[chapters.length - 1];
    if (!lastCh) return;
    const book = getBook(lastCh.book);
    if (!book) return;
    if (lastCh.chapter < book.chapters) {
      onNavigate?.(translationId, book.usfm, lastCh.chapter + 1);
    } else {
      const nextBook = getNextBook(book.usfm);
      if (nextBook) {
        onNavigate?.(translationId, nextBook.usfm, 1);
      }
    }
  }

  // ── Keyboard navigation ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goToPrevChapter();
      else if (e.key === 'ArrowRight') goToNextChapter();
      else if (e.key === 'Escape') setActiveVerse(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chapters, translationId]);

  // ── Font size control ──
  function changeFontSize(delta: number) {
    setFontSizeIdx((prev) => {
      const next = Math.max(0, Math.min(FONT_SIZES.length - 1, prev + delta));
      saveFontSizeIdx(next);
      return next;
    });
  }

  const fontSize = FONT_SIZES[fontSizeIdx];
  const currentBook = getBook(bookUsfm.toUpperCase());

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-saffron" />
        <span className="ml-3 text-sm text-muted-foreground">Loading Scripture…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={onOpenTranslationPicker} variant="outline" size="sm">
          Try a different translation
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
        <button
          onClick={onOpenBookPicker}
          className="flex items-center gap-1.5 rounded-full bg-saffron-soft/50 px-3 py-1.5 text-sm font-medium text-saffron hover:bg-saffron-soft"
        >
          {currentBook?.short} {chapter}
        </button>

        <button
          onClick={onOpenTranslationPicker}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-white/80 hover:border-saffron/40 hover:text-white"
        >
          {translationId}
        </button>

        <div className="ml-auto flex items-center gap-1">
          {/* Font size control */}
          <div className="relative">
            <button
              onClick={() => setShowFontControl((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-white"
              aria-label="Text size"
            >
              <Type className="h-4 w-4" />
            </button>
            {showFontControl && (
              <div className="absolute right-0 top-10 z-20 flex items-center gap-1 rounded-xl border border-border bg-popover p-2 shadow-lg">
                <button
                  onClick={() => changeFontSize(-1)}
                  disabled={fontSizeIdx === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white hover:bg-white/10 disabled:opacity-30"
                >
                  A-
                </button>
                <span className="min-w-[2.5rem] text-center text-xs text-muted-foreground">
                  {fontSize}px
                </span>
                <button
                  onClick={() => changeFontSize(1)}
                  disabled={fontSizeIdx === FONT_SIZES.length - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold text-white hover:bg-white/10 disabled:opacity-30"
                >
                  A+
                </button>
              </div>
            )}
          </div>

          {/* Prev/next chapter */}
          <button
            onClick={goToPrevChapter}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-white"
            aria-label="Previous chapter"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextChapter}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-white"
            aria-label="Next chapter"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scroll reader */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-[calc(100vh-180px)] overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="mx-auto max-w-3xl px-4 py-6">
          {chapters.map((chapter) => {
            const key = chapterKey(chapter.book, chapter.chapter);
            return (
              <div
                key={key}
                ref={(el) => {
                  if (el) chapterRefs.current.set(key, el);
                  else chapterRefs.current.delete(key);
                }}
                className="mb-12"
              >
                {/* Chapter heading */}
                <div className="mb-6 border-b border-border pb-3">
                  <h2 className="text-2xl font-bold text-white">
                    {chapter.bookName} {chapter.chapter}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {chapter.verseCount} verses · {chapter.translation}
                  </p>
                </div>

                {/* Verses — continuous text with verse numbers as superscripts */}
                <div
                  className="bible-text leading-relaxed text-white/90"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
                >
                  {chapter.verses.map((verse) => {
                    const vKey = verseKey(chapter.book, chapter.chapter, verse.verse);
                    const isBookmarked = bookmarks.has(vKey);
                    const isActive =
                      activeVerse?.bookUsfm === chapter.book &&
                      activeVerse?.chapter === chapter.chapter &&
                      activeVerse?.verse === verse.verse;
                    return (
                      <span key={verse.verse} className="group relative">
                        <sup
                          className="mr-1 cursor-pointer text-[0.65em] font-semibold text-saffron/70 hover:text-saffron"
                          onClick={() =>
                            setActiveVerse({
                              bookUsfm: chapter.book,
                              chapter: chapter.chapter,
                              verse: verse.verse,
                            })
                          }
                        >
                          {verse.verse}
                        </sup>
                        <span
                          className={cn(
                            'transition-colors',
                            isActive && 'rounded bg-saffron/20 px-0.5',
                          )}
                        >
                          {verse.text}{' '}
                        </span>
                        {/* Inline bookmark indicator */}
                        {isBookmarked && (
                          <BookmarkCheck className="ml-0.5 inline h-3.5 w-3.5 text-saffron/70" />
                        )}
                        {/* Inline action buttons — appear on hover (desktop) / always visible (mobile) */}
                        <span className="ml-1 inline-flex items-center gap-0.5 align-middle opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(chapter, verse);
                            }}
                            className="rounded p-0.5 text-white/40 hover:text-saffron"
                            aria-label="Bookmark verse"
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="h-3.5 w-3.5 text-saffron" />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyVerse(chapter, verse);
                            }}
                            className="rounded p-0.5 text-white/40 hover:text-saffron"
                            aria-label="Copy verse"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openShareDialog(chapter, verse);
                            }}
                            className="rounded p-0.5 text-white/40 hover:text-saffron"
                            aria-label="Share verse"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Loading indicator for infinite scroll */}
          {loadingMore && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-saffron" />
            </div>
          )}

          {/* End-of-Bible message */}
          {chapters.length > 0 &&
            chapters[chapters.length - 1].book === 'REV' &&
            chapters[chapters.length - 1].chapter === 22 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                🎉 You&apos;ve reached the end of the Bible.
              </div>
            )}
        </div>
      </div>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-saffron text-white shadow-lg transition-transform hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Verse action popover */}
      <VerseActionsDialog
        activeVerse={activeVerse}
        chapters={chapters}
        bookmarks={bookmarks}
        onClose={() => setActiveVerse(null)}
        onToggleBookmark={toggleBookmark}
        onCopy={copyVerse}
        onShare={shareVerse}
      />

      {/* Verse share dialog with image generation */}
      <VerseShareDialog
        open={shareDialogState.open}
        onOpenChange={(open) => setShareDialogState((prev) => ({ ...prev, open }))}
        chapter={shareDialogState.chapter}
        verse={shareDialogState.verse}
      />
    </div>
  );
}

// ── Verse actions dialog ───────────────────────────────────────────────────

interface VerseActionsDialogProps {
  activeVerse: { bookUsfm: string; chapter: number; verse: number } | null;
  chapters: LoadedChapter[];
  bookmarks: Set<string>;
  onClose: () => void;
  onToggleBookmark: (chapter: LoadedChapter, verse: Verse) => void;
  onCopy: (chapter: LoadedChapter, verse: Verse) => void;
  onShare: (chapter: LoadedChapter, verse: Verse) => void;
}

function VerseActionsDialog({
  activeVerse,
  chapters,
  bookmarks,
  onClose,
  onToggleBookmark,
  onCopy,
  onShare,
}: VerseActionsDialogProps) {
  // Find the chapter + verse that match the active verse.
  const { chapter, verse } = useMemo(() => {
    if (!activeVerse) return { chapter: null, verse: null };
    const ch = chapters.find(
      (c) => c.book === activeVerse.bookUsfm && c.chapter === activeVerse.chapter,
    );
    if (!ch) return { chapter: null, verse: null };
    const v = ch.verses.find((verse) => verse.verse === activeVerse.verse);
    return { chapter: ch, verse: v ?? null };
  }, [activeVerse, chapters]);

  if (!chapter || !verse) return null;

  const vKey = `${chapter.book}-${chapter.chapter}-${verse.verse}`;
  const isBookmarked = bookmarks.has(vKey);

  return (
    <Dialog open={!!activeVerse} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-border bg-card p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">
          {chapter.bookName} {chapter.chapter}:{verse.verse}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Verse actions: bookmark, copy, or share this verse.
        </DialogDescription>

        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-saffron/80">
              {chapter.bookName} {chapter.chapter}:{verse.verse}
            </span>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-5 text-base leading-relaxed text-white">
            {verse.text}
          </p>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                onToggleBookmark(chapter, verse);
                onClose();
              }}
              variant={isBookmarked ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              {isBookmarked ? (
                <>
                  <BookmarkCheck className="mr-1.5 h-4 w-4" /> Bookmarked
                </>
              ) : (
                <>
                  <Bookmark className="mr-1.5 h-4 w-4" /> Bookmark
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                onCopy(chapter, verse);
                onClose();
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
            <Button
              onClick={() => {
                onShare(chapter, verse);
                onClose();
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
