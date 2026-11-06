'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookImage, Search, Loader2, BookOpen, ChevronRight, ChevronLeft, X,
  Bookmark, BookmarkCheck, Maximize2, Minimize2, BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ComicStory {
  id: string;
  title: string;
  testament: string;
  category: string;
  bibleBook: string | null;
  bibleChapter: number | null;
  bibleVerse: number | null;
  coverImagePath: string | null;
  description: string | null;
  isKidsFriendly: boolean;
  ageGroup: string | null;
  pageLayout: string;
  pageCount: number;
  readingProgress: number | null;
  bookmarked: boolean;
}

interface ComicPage {
  id: string;
  pageNumber: number;
  imagePath: string;
  isSpread: boolean;
}

interface ComicStoryDetail {
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

type Tab = 'all' | 'OT' | 'NT' | 'kids';

// ── Component ──────────────────────────────────────────────────────────────

export function ComicBibleView() {
  const [stories, setStories] = useState<ComicStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [story, setStory] = useState<ComicStoryDetail | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // ── Load stories list ──
  const loadStories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab === 'OT') params.set('testament', 'OT');
    if (tab === 'NT') params.set('testament', 'NT');
    if (tab === 'kids') params.set('kids', '1');
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/comics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch {
      // Non-fatal.
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    const timer = setTimeout(loadStories, 300);
    return () => clearTimeout(timer);
  }, [loadStories]);

  // ── Load selected story detail ──
  useEffect(() => {
    if (!selectedStoryId) {
      setStory(null);
      return;
    }
    let cancelled = false;
    setStoryLoading(true);
    Promise.resolve().then(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/comics/${selectedStoryId}?lang=en`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStory(data.story);
        setBookmarked(data.story.bookmarked);
        setCurrentPage(data.story.lastPageRead && data.story.lastPageRead > 0
          ? Math.min(data.story.lastPageRead, data.story.pages.length)
          : 1);
      } catch {
        // Non-fatal.
      } finally {
        if (!cancelled) setStoryLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedStoryId]);

  // ── Save reading progress ──
  const saveProgress = useCallback(async (page: number) => {
    if (!isAuthenticated || !selectedStoryId) return;
    try {
      await fetch('/api/comics/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: selectedStoryId, lastPageRead: page }),
      });
    } catch {
      // Non-fatal.
    }
  }, [isAuthenticated, selectedStoryId]);

  // ── Navigation ──
  const totalPages = story?.pages.length ?? 0;
  const isSpreadLayout = story?.pageLayout === 'spread';
  const pagesPerView = isSpreadLayout ? 2 : 1;
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
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── Bookmark toggle ──
  async function toggleBookmark() {
    if (!isAuthenticated || !selectedStoryId) {
      toast({ title: 'Sign in to bookmark stories.' });
      return;
    }
    try {
      if (bookmarked) {
        setBookmarked(false);
        await fetch(`/api/comics/bookmarks?storyId=${selectedStoryId}`, { method: 'DELETE' });
      } else {
        setBookmarked(true);
        await fetch('/api/comics/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyId: selectedStoryId }),
        });
      }
      // Refresh stories to update bookmark status.
      void loadStories();
    } catch {
      setBookmarked((b) => !b);
    }
  }

  // ── Current pages to display ──
  const currentPages = story
    ? story.pages.filter((p) => {
        if (pagesPerView === 2) {
          return p.pageNumber === currentPage || p.pageNumber === currentPage + 1;
        }
        return p.pageNumber === currentPage;
      })
    : [];

  const progress = totalPages > 0 ? Math.round((currentPage / maxPage) * 100) : 0;

  // ── Handle story select ──
  function handleStorySelect(storyId: string) {
    setSelectedStoryId(storyId);
    // On mobile, scroll the reader into view.
    setTimeout(() => {
      document.getElementById('comic-reader-panel')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  // ── Render ──
  return (
    <div className="min-h-full">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0B2545]">
        {/* Decorative comic-book glow */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-saffron/10 blur-3xl" aria-hidden />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden />
        <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-10">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <BookImage className="h-7 w-7 text-saffron" />
            <span className="text-saffron">Lordsbook</span> Comic Bible
          </h1>
          <p className="mt-0.5 text-lg font-semibold text-saffron/90 sm:text-xl">
            The Bible in Graphic Stories
          </p>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Experience God&rsquo;s Word through powerful illustrated comics — for all ages!
          </p>
        </div>
      </div>

      {/* ── Integrated workspace: Library (left) + Reader (right) ── */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-120px)] lg:overflow-hidden">

        {/* ══ LEFT: Story Library ══ */}
        <div className="flex w-full flex-col border-r border-border lg:w-[340px] lg:shrink-0 lg:overflow-y-auto">
          {/* Library header */}
          <div className="border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <BookMarked className="h-4 w-4 text-saffron" />
              Story Library
            </h2>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            {([
              { key: 'all', label: 'All' },
              { key: 'OT', label: 'Old Testament' },
              { key: 'NT', label: 'New Testament' },
              { key: 'kids', label: 'For Kids' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                  tab === key
                    ? 'bg-saffron text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="border-b border-border px-4 py-2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stories..."
                className="w-full bg-transparent text-xs text-white placeholder:text-muted-foreground focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-white" aria-label="Clear">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Story cards — compact list format */}
          <div className="flex-1 space-y-2 p-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-saffron" />
              </div>
            ) : stories.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BookImage className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  {search ? `No stories match "${search}".` : 'No stories published yet.'}
                </p>
              </div>
            ) : (
              stories.map((s) => {
                const storyProgress = s.readingProgress
                  ? Math.round((s.readingProgress / Math.max(s.pageCount, 1)) * 100)
                  : 0;
                const isSelected = s.id === selectedStoryId;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStorySelect(s.id)}
                    className={cn(
                      'group flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition-all',
                      isSelected
                        ? 'border-saffron/50 bg-saffron/10'
                        : 'border-border bg-card hover:border-saffron/30 hover:bg-white/5',
                    )}
                  >
                    {/* Cover thumbnail */}
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-background">
                      {s.coverImagePath ? (
                        <img
                          src={s.coverImagePath}
                          alt={s.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a0a2e] to-[#0B2545]">
                          <BookImage className="h-5 w-5 text-white/20" />
                        </div>
                      )}
                      {s.isKidsFriendly && (
                        <span className="absolute right-0.5 top-0.5 rounded bg-saffron px-1 text-[8px] font-bold text-white">K</span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-xs font-bold', isSelected ? 'text-saffron' : 'text-white')}>
                        {s.title}
                      </p>
                      {s.bibleBook && (
                        <p className="text-[10px] text-saffron/70">
                          {s.bibleBook} {s.bibleChapter}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{s.pageCount} pages</span>
                        {storyProgress > 0 && (
                          <span className="text-[10px] text-saffron">{storyProgress}%</span>
                        )}
                      </div>
                      {/* Mini progress bar */}
                      {storyProgress > 0 && (
                        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={cn('h-full', storyProgress >= 100 ? 'bg-green-500' : 'bg-saffron')}
                            style={{ width: `${storyProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {/* Chevron */}
                    <ChevronRight className={cn(
                      'mt-3 h-3 w-3 shrink-0 transition-transform',
                      isSelected ? 'text-saffron' : 'text-white/20 group-hover:text-white/50',
                    )} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══ RIGHT: Comic Reader ══ */}
        <div
          id="comic-reader-panel"
          className={cn(
            'flex flex-1 flex-col bg-[#0a0a0f]',
            fullscreen && 'fixed inset-0 z-50 lg:static',
          )}
        >
          {!selectedStoryId || !story ? (
            /* Empty state — no story selected */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <BookOpen className="h-16 w-16 text-white/10" />
              <div>
                <h3 className="text-lg font-bold text-white/30">Select a story</h3>
                <p className="mt-1 text-sm text-white/20">
                  Choose a comic story from the library to start reading.
                </p>
              </div>
            </div>
          ) : storyLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-saffron" />
            </div>
          ) : (
            <>
              {/* Reader toolbar */}
              <div className="flex items-center gap-2 border-b border-white/10 bg-[#1a1a1e] px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="truncate text-sm font-bold text-white">
                    {story.translation?.title || story.title}
                  </span>
                  {story.bibleBook && (
                    <span className="ml-2 text-xs text-saffron">
                      · {story.bibleBook} {story.bibleChapter}
                    </span>
                  )}
                </div>
                <button
                  onClick={toggleBookmark}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-saffron"
                  aria-label="Bookmark"
                >
                  {bookmarked ? <BookmarkCheck className="h-4 w-4 text-saffron" /> : <Bookmark className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setFullscreen((f) => !f)}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedStoryId(null)}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
                  aria-label="Close reader"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Comic pages display — fills available space */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black p-2 sm:p-4">
                {/* Prev button (desktop) */}
                <button
                  onClick={goPrev}
                  disabled={currentPage <= 1}
                  className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/20 disabled:opacity-20"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Pages */}
                <div className={cn(
                  'flex h-full w-full items-center justify-center gap-1 sm:gap-2',
                  pagesPerView === 2 ? 'flex-row' : 'flex-col',
                )}>
                  {currentPages.map((page) => (
                    <img
                      key={page.id}
                      src={page.imagePath}
                      alt={`Page ${page.pageNumber}`}
                      className={cn(
                        'h-full w-auto max-w-full rounded-md object-contain',
                        pagesPerView === 2 ? 'max-w-[49%]' : 'max-w-full',
                      )}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                  ))}
                </div>

                {/* Next button (desktop) */}
                <button
                  onClick={goNext}
                  disabled={currentPage >= maxPage}
                  className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-saffron text-white backdrop-blur transition-all hover:brightness-110 disabled:opacity-20"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Bottom navigation bar */}
              <div className="flex items-center gap-3 border-t border-white/10 bg-[#1a1a1e] px-4 py-3">
                <button
                  onClick={goPrev}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-30 hover:bg-white/20"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>

                {/* Progress slider */}
                <div className="flex flex-1 flex-col items-center gap-1">
                  <input
                    type="range"
                    min={1}
                    max={maxPage}
                    value={currentPage}
                    onChange={(e) => {
                      const p = parseInt(e.target.value, 10);
                      setCurrentPage(p);
                      void saveProgress(p);
                    }}
                    className="h-1 w-full max-w-xs cursor-pointer appearance-none rounded-full bg-white/10 accent-saffron"
                    aria-label="Page slider"
                  />
                  <span className="text-[10px] text-white/40">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={goNext}
                  disabled={currentPage >= maxPage}
                  className="flex items-center gap-1 rounded-full bg-saffron px-3 py-1.5 text-xs text-white disabled:opacity-30 hover:brightness-110"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
