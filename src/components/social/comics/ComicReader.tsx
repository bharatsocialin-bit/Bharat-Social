'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, X, Bookmark, BookmarkCheck,
  Maximize2, Minimize2, Loader2, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ComicPage {
  id: string;
  pageNumber: number;
  imagePath: string;
  isSpread: boolean;
}

interface ComicStoryData {
  id: string;
  title: string;
  testament: string;
  category: string;
  bibleBook: string | null;
  bibleChapter: number | null;
  bibleVerse: number | null;
  coverImagePath: string | null;
  description: string | null;
  keyVerse: string | null;
  keyVerseRef: string | null;
  lesson: string | null;
  prayer: string | null;
  isKidsFriendly: boolean;
  pageLayout: string;
  pages: ComicPage[];
  translation: {
    title: string;
    introduction: string | null;
    narration: string | null;
    scripture: string | null;
    lesson: string | null;
    prayer: string | null;
    status: string;
  } | null;
  translationStatus: string;
  lastPageRead: number | null;
  bookmarked: boolean;
}

interface ComicReaderProps {
  storyId: string;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ComicReader({ storyId, onClose }: ComicReaderProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [story, setStory] = useState<ComicStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Load story ──
  useEffect(() => {
    let cancelled = false;
    // Defer setState to avoid the set-state-in-effect lint rule.
    Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/comics/${storyId}?lang=en`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStory(data.story);
        setBookmarked(data.story.bookmarked);
        if (data.story.lastPageRead && data.story.lastPageRead > 0) {
          setCurrentPage(Math.min(data.story.lastPageRead, data.story.pages.length));
        }
      } catch {
        // Non-fatal.
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [storyId]);

  // ── Save reading progress ──
  const saveProgress = useCallback(async (page: number) => {
    if (!isAuthenticated) return;
    try {
      await fetch('/api/comics/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, lastPageRead: page }),
      });
    } catch {
      // Non-fatal.
    }
  }, [isAuthenticated, storyId]);

  // ── Navigation ──
  const totalPages = story?.pages.length ?? 0;
  const isSpreadLayout = story?.pageLayout === 'spread';
  // For spread layout, we show 2 pages at a time on desktop.
  const pagesPerView = isSpreadLayout && !fullscreen ? 2 : 1;
  const maxPage = Math.max(1, totalPages - pagesPerView + 1);

  function goPrev() {
    setCurrentPage((p) => {
      const next = Math.max(1, p - pagesPerView);
      void saveProgress(next);
      return next;
    });
  }

  function goNext() {
    setCurrentPage((p) => {
      const next = Math.min(maxPage, p + pagesPerView);
      void saveProgress(next);
      return next;
    });
  }

  // ── Keyboard navigation ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
        else onClose();
      } else if (e.key === 'f') setFullscreen((f) => !f);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, onClose, maxPage, pagesPerView]);

  // ── Bookmark toggle ──
  async function toggleBookmark() {
    if (!isAuthenticated) {
      toast({ title: 'Sign in to bookmark stories.' });
      return;
    }
    try {
      if (bookmarked) {
        setBookmarked(false);
        await fetch(`/api/comics/bookmarks?storyId=${storyId}`, { method: 'DELETE' });
      } else {
        setBookmarked(true);
        await fetch('/api/comics/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyId }),
        });
      }
    } catch {
      setBookmarked((b) => !b);
    }
  }

  // ── Fullscreen ──
  function toggleFullscreen() {
    setFullscreen((f) => !f);
  }

  // ── Get current pages to display ──
  const currentPages = story
    ? story.pages.filter((p) => {
        if (pagesPerView === 2) {
          return p.pageNumber === currentPage || p.pageNumber === currentPage + 1;
        }
        return p.pageNumber === currentPage;
      })
    : [];

  const progress = totalPages > 0 ? Math.round((currentPage / maxPage) * 100) : 0;

  // ── Render ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-saffron" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Story not found.</p>
        <button onClick={onClose} className="rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white">
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-[#0a0a0f]',
        fullscreen ? 'fixed inset-0 z-50' : 'min-h-full',
      )}
    >
      {/* Toolbar */}
      <div className={cn(
        'flex items-center gap-2 border-b border-white/10 bg-[#1a1a1e] px-4 py-2.5',
        fullscreen && 'absolute inset-x-0 top-0 z-20 bg-black/80 backdrop-blur',
      )}>
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-white/70 hover:text-white">
          <ChevronLeft className="h-4 w-4" />
          Library
        </button>
        <div className="mx-2 h-4 w-px bg-white/10" />
        <span className="truncate text-sm font-semibold text-white">{story.title}</span>
        {story.bibleBook && (
          <span className="hidden text-xs text-saffron sm:inline">
            · {story.bibleBook} {story.bibleChapter}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Bookmark */}
          <button
            onClick={toggleBookmark}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-saffron"
            aria-label="Bookmark"
          >
            {bookmarked ? <BookmarkCheck className="h-4 w-4 text-saffron" /> : <Bookmark className="h-4 w-4" />}
          </button>
          {/* Info */}
          <button
            onClick={() => setShowInfo((s) => !s)}
            className={cn(
              'rounded-full p-1.5 hover:bg-white/10',
              showInfo ? 'text-saffron' : 'text-white/60 hover:text-white',
            )}
            aria-label="Story info"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Fullscreen"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Info panel (collapsible) */}
      {showInfo && (
        <div className="border-b border-white/10 bg-[#1a1a1e] px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-3">
            {story.translation?.introduction && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-saffron/70">Introduction</h3>
                <p className="mt-1 text-sm text-white/80">{story.translation.introduction}</p>
              </div>
            )}
            {story.keyVerse && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-saffron/70">Key Verse</h3>
                <p className="mt-1 text-sm italic text-white/80">&ldquo;{story.keyVerse}&rdquo;</p>
                <p className="text-xs text-saffron">— {story.keyVerseRef}</p>
              </div>
            )}
            {story.translation?.lesson && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-saffron/70">What We Learn</h3>
                <p className="mt-1 text-sm text-white/80">{story.translation.lesson}</p>
              </div>
            )}
            {story.translation?.prayer && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-saffron/70">Prayer</h3>
                <p className="mt-1 text-sm italic text-white/80">{story.translation.prayer}</p>
              </div>
            )}
            {story.translationStatus === 'coming_soon' && (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                Translation for this language is coming soon. Showing default English text.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Comic pages display */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-black p-2 sm:p-4">
        <div className={cn(
          'flex h-full items-center justify-center gap-2',
          pagesPerView === 2 ? 'flex-row' : 'flex-col',
        )}>
          {currentPages.map((page) => (
            <img
              key={page.id}
              src={page.imagePath}
              alt={`Page ${page.pageNumber}`}
              className={cn(
                'max-h-full rounded-lg object-contain',
                pagesPerView === 2 ? 'max-w-[50%]' : 'max-w-full',
              )}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className={cn(
        'flex items-center gap-3 border-t border-white/10 bg-[#1a1a1e] px-4 py-3',
        fullscreen && 'absolute inset-x-0 bottom-0 z-20 bg-black/80 backdrop-blur',
      )}>
        <button
          onClick={goPrev}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-30 hover:bg-white/20"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        {/* Progress bar */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-saffron transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] text-white/40">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <button
          onClick={goNext}
          disabled={currentPage >= maxPage}
          className="flex items-center gap-1 rounded-full bg-saffron px-3 py-1.5 text-sm text-white disabled:opacity-30 hover:brightness-110"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Tap zones for mobile (left = prev, right = next) */}
      <button
        onClick={goPrev}
        disabled={currentPage <= 1}
        className="absolute left-0 top-0 z-10 h-full w-1/4 opacity-0 disabled:hidden"
        aria-label="Previous page"
      />
      <button
        onClick={goNext}
        disabled={currentPage >= maxPage}
        className="absolute right-0 top-0 z-10 h-full w-1/4 opacity-0 disabled:hidden"
        aria-label="Next page"
      />
    </div>
  );
}
