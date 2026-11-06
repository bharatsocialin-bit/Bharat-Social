'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import {
  BookImage, Search, Loader2, BookOpen, ChevronRight, ChevronLeft, X,
  Bookmark, BookmarkCheck, Maximize2, Minimize2, BookMarked, ZoomIn, ZoomOut,
  Sparkles, Baby, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBook } from '@/lib/bible/books';
import { buildViews, viewLabel, type ReaderView } from '@/lib/comics/views';
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
  // Number of assets flagged as pre-composed two-page spreads. When this
  // equals pageCount the story's artwork is entirely spread-based.
  spreadAssets: number;
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

const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3];

// USFM book code ("1SA") → readable name ("1 Samuel").
function bookLabel(usfm: string | null | undefined): string | null {
  if (!usfm) return null;
  return getBook(usfm)?.name ?? usfm;
}

// The reader view model (ReaderView / buildViews / viewLabel) lives in
// @/lib/comics/views — shared with the Admin CMS preview so both always
// agree on how pages and spreads are composed.

// ── Reader image: sizes itself from the actual canvas box ──────────────────
// The displayed width/height are computed from the measured reader canvas and
// the image's intrinsic aspect ratio — no arbitrary pixel caps. A single
// (spread) artwork may use up to ~90% of the canvas width and the full canvas
// height; a pair of pages splits the width. object-fit: contain + exact
// aspect-preserving dimensions guarantee panels are never cropped or skewed.

function ReaderImage({
  page,
  canvasW,
  canvasH,
  mode,
  zoom,
}: {
  page: ComicPage;
  canvasW: number;
  canvasH: number;
  mode: 'single' | 'pair';
  zoom: number;
}) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const widthFraction = mode === 'pair' ? 0.48 : 0.9;
  // Padding of the canvas wrapper (p-3 = 12px per side). The fit is computed
  // against the box INSIDE the padding so the artwork never overflows the
  // scroll layer at 100% zoom.
  const PAD = 12;

  let style: CSSProperties | undefined;
  if (nat && canvasW > 60 && canvasH > 60) {
    const availW = Math.max(60, canvasW - PAD * 2);
    const availH = Math.max(60, canvasH - PAD * 2);
    const fitScale = Math.min((availW * widthFraction) / nat.w, availH / nat.h);
    const scale = fitScale * zoom;
    style = {
      width: Math.round(nat.w * scale),
      height: Math.round(nat.h * scale),
    };
  }

  return (
    <img
      src={page.imagePath}
      alt={`Page ${page.pageNumber}`}
      onLoad={(e) =>
        setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
      }
      style={style}
      // max-w-none overrides Tailwind preflight (img { max-width: 100% })
      // which would clamp the zoomed width while the inline height stays
      // fixed — distorting the aspect ratio at zoom levels above fit.
      className="max-w-none select-none rounded-lg object-contain shadow-2xl shadow-black/70 ring-1 ring-white/10"
      draggable={false}
      onError={(e) => {
        (e.target as HTMLImageElement).style.opacity = '0.2';
      }}
    />
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function ComicBibleView() {
  const [stories, setStories] = useState<ComicStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [story, setStory] = useState<ComicStoryDetail | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  // Reader position is expressed as an index into the views array (see
  // buildViews) — not a raw page number — so pre-composed spreads and
  // future individual pages navigate identically.
  const [viewIndex, setViewIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  // Desktop = Tailwind `lg` breakpoint: only there may individual page
  // assets be paired side-by-side. Pre-composed spread assets render full
  // width at every breakpoint.
  const [isDesktop, setIsDesktop] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Track the lg breakpoint so mobile always reads one page at a time.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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
        // Resume from saved progress: land on the view that contains the
        // last page the user read.
        const savedPage = data.story.lastPageRead;
        const loadedViews = buildViews(data.story.pages ?? [], window.matchMedia('(min-width: 1024px)').matches);
        if (savedPage && savedPage > 0 && loadedViews.length > 0) {
          const idx = loadedViews.findIndex((v) =>
            v.pages.some((p) => p.pageNumber === savedPage),
          );
          setViewIndex(idx >= 0 ? idx : 0);
        } else {
          setViewIndex(0);
        }
      } catch {
        // Non-fatal.
      } finally {
        if (!cancelled) setStoryLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedStoryId]);

  // Reset zoom when the story changes.
  useEffect(() => {
    setZoom(1);
    setShowInfo(false);
  }, [selectedStoryId]);

  // ── Measure the reader canvas so artwork scales to the real container ──
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setCanvasSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedStoryId, story, fullscreen]);

  // ── Save reading progress ──
  const saveProgress = useCallback(async (page: number) => {
    if (!isAuthenticated || !selectedStoryId) return;
    // Optimistically reflect progress on the library card.
    setStories((prev) => prev.map((s) =>
      s.id === selectedStoryId ? { ...s, readingProgress: Math.max(s.readingProgress ?? 0, page) } : s,
    ));
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
  // Views are rebuilt whenever the story or breakpoint changes (a story with
  // individual page assets pairs 2-up on desktop, 1-up on mobile; spread
  // assets always stand alone).
  const views = useMemo(
    () => (story ? buildViews(story.pages, isDesktop) : []),
    [story, isDesktop],
  );
  const currentView = views[viewIndex];
  const maxViewIndex = Math.max(0, views.length - 1);

  function goToView(index: number) {
    const clamped = Math.min(maxViewIndex, Math.max(0, index));
    setViewIndex(clamped);
    const view = views[clamped];
    if (view) void saveProgress(view.firstPage);
  }

  function goPrev() {
    goToView(viewIndex - 1);
  }

  function goNext() {
    goToView(viewIndex + 1);
  }

  // ── Keyboard navigation ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') setFullscreen(false);
      else if (e.key === '+' || e.key === '=') setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)] ?? z);
      else if (e.key === '-') setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)] ?? z);
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
  const currentPages = currentView ? currentView.pages : [];

  // Progress across the story's REAL assets: share of views the reader has
  // reached. A single-asset story simply reads "Spread 1 of 1".
  const progress = views.length > 0
    ? Math.round(((viewIndex + 1) / views.length) * 100)
    : 0;
  const singleView = views.length <= 1;
  const label = viewLabel(currentView, viewIndex, views, totalPages);

  // ── Zoom helpers ──
  function zoomIn() {
    setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)] ?? z);
  }
  function zoomOut() {
    setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)] ?? z);
  }

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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ═══ CINEMATIC HERO BANNER ═══ */}
      <div className="relative h-[168px] shrink-0 overflow-hidden border-b border-violet-500/20 sm:h-[210px] lg:h-[248px]">
        <img
          src="/comics/hero-banner.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[68%_center] sm:object-[center]"
        />
        {/* Legibility gradients — navy fade from the left + bottom blend */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0716]/95 via-[#0B0716]/55 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B0716] to-transparent" aria-hidden />

        {/* Banner content */}
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-4 sm:px-8 lg:px-10">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 sm:text-xs">
            <BookImage className="h-3.5 w-3.5 text-amber-300" />
            Lordsbook presents
          </p>
          <h1 className="mt-1 font-comic text-4xl leading-none tracking-wide sm:text-6xl lg:text-7xl">
            <span
              className="bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_3px_2px_rgba(0,0,0,0.55)]"
              style={{ WebkitTextStroke: '1.5px rgba(30,15,55,0.85)' }}
            >
              Comic Bible
            </span>
          </h1>
          <p className="mt-1.5 font-comic text-lg tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)] sm:text-2xl">
            The Bible in Graphic Stories
          </p>
          <p className="mt-1 hidden max-w-md text-xs text-white/70 sm:block sm:text-sm">
            Experience God&rsquo;s Word through powerful illustrated comics — for all ages!
          </p>
        </div>
      </div>

      {/* ═══ WORKSPACE — Library (left) + Reader (right) ═══ */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">

        {/* ─── LEFT: Story Library ─── */}
        <aside className="flex w-full shrink-0 flex-col border-b border-border bg-[#0E0B1A]/60 lg:w-[350px] lg:border-b-0 lg:border-r lg:min-h-0 xl:w-[400px]">
          {/* Library header */}
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h2 className="flex items-center gap-2 font-comic text-lg tracking-wide text-amber-300">
              <BookMarked className="h-4 w-4" />
              Story Library
            </h2>
            {!loading && stories.length > 0 && (
              <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-[10px] font-bold text-violet-300 ring-1 ring-violet-500/40">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </span>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5 border-b border-border/70 px-4 py-2.5">
            {([
              { key: 'all', label: 'All Stories', icon: Sparkles },
              { key: 'OT', label: 'Old Testament', icon: BookOpen },
              { key: 'NT', label: 'New Testament', icon: BookOpen },
              { key: 'kids', label: 'For Kids', icon: Baby },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all',
                  tab === key
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'bg-white/5 text-white/55 ring-1 ring-white/10 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="border-b border-border/70 px-4 py-2">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-background px-3 py-1.5 focus-within:ring-1 focus-within:ring-violet-500/60">
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

          {/* Story cards — illustrated covers */}
          <div className="grid grid-cols-2 gap-2.5 p-3 lg:flex-1 lg:content-start lg:overflow-y-auto">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              </div>
            ) : stories.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center gap-2 py-10 text-center">
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
                const hasStarted = (s.readingProgress ?? 0) > 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleStorySelect(s.id)}
                    className={cn(
                      'group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all',
                      isSelected
                        ? 'border-violet-500 shadow-lg shadow-violet-600/20 ring-2 ring-violet-500/50'
                        : 'border-border hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/30',
                    )}
                  >
                    {/* Cover artwork */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#120e20]">
                      {s.coverImagePath ? (
                        <img
                          src={s.coverImagePath}
                          alt={s.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a0a2e] to-[#0B2545]">
                          <BookImage className="h-8 w-8 text-white/20" />
                        </div>
                      )}
                      {/* Bottom fade for legibility */}
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" aria-hidden />
                      {s.isKidsFriendly && (
                        <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-amber-950 shadow">
                          <Baby className="h-2.5 w-2.5" /> Kids
                        </span>
                      )}
                      {/* Bible reference chip on cover */}
                      {bookLabel(s.bibleBook) && (
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-sm">
                          {bookLabel(s.bibleBook)} {s.bibleChapter}
                        </span>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="flex flex-1 flex-col gap-1 p-2">
                      <p className={cn(
                        'truncate font-comic text-sm tracking-wide',
                        isSelected ? 'text-violet-300' : 'text-white',
                      )}>
                        {s.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        {/* Truthful asset count: a story whose assets are all
                            pre-composed two-page spreads is labelled in
                            spreads, not padded into fake page numbers. */}
                        <span>
                          {s.spreadAssets === s.pageCount && s.pageCount > 0
                            ? `${s.pageCount} ${s.pageCount === 1 ? 'spread' : 'spreads'}`
                            : `${s.pageCount} ${s.pageCount === 1 ? 'page' : 'pages'}`}
                        </span>
                        {storyProgress > 0 && (
                          <span className={cn('font-semibold', storyProgress >= 100 ? 'text-emerald-400' : 'text-violet-300')}>
                            {storyProgress}%
                          </span>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={cn('h-full rounded-full transition-all', storyProgress >= 100 ? 'bg-emerald-500' : 'bg-violet-500')}
                          style={{ width: `${storyProgress}%` }}
                        />
                      </div>
                      {/* CTA */}
                      <span
                        className={cn(
                          'mt-1 flex items-center justify-center gap-1 rounded-full py-1.5 text-[10px] font-bold transition-colors',
                          isSelected
                            ? 'bg-violet-500 text-white'
                            : 'bg-violet-600/90 text-white group-hover:bg-violet-500',
                        )}
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        {hasStarted ? 'Continue Reading' : 'Start Reading'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── RIGHT: Comic Reader ─── */}
        <section
          id="comic-reader-panel"
          className={cn(
            'relative flex min-w-0 flex-1 flex-col bg-[#0b0b14]',
            fullscreen && 'fixed inset-0 z-50',
          )}
        >
          {!selectedStoryId || !story ? (
            /* Empty state — no story selected */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="rounded-3xl bg-violet-600/10 p-6 ring-1 ring-violet-500/20">
                <BookOpen className="h-14 w-14 text-violet-400/40" />
              </div>
              <div>
                <h3 className="font-comic text-2xl tracking-wide text-white/50">Select a story</h3>
                <p className="mt-1 max-w-xs text-sm text-white/30">
                  Choose a comic story from the library to start reading.
                </p>
              </div>
            </div>
          ) : storyLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {/* Reader toolbar */}
              <div className="flex shrink-0 items-center gap-1.5 border-b border-white/10 bg-[#14121f] px-3 py-2 sm:px-4">
                <button
                  onClick={() => setSelectedStoryId(null)}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="Back to library"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-comic text-base tracking-wide text-white sm:text-lg">
                    {story.translation?.title || story.title}
                  </span>
                  {bookLabel(story.bibleBook) && (
                    <span className="block text-[10px] font-semibold text-amber-300/90">
                      {bookLabel(story.bibleBook)} {story.bibleChapter}
                    </span>
                  )}
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-0.5 rounded-full bg-white/5 px-1 py-0.5 ring-1 ring-white/10">
                  <button
                    onClick={zoomOut}
                    disabled={zoom <= 1}
                    className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-25"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="min-w-[38px] rounded-full px-1 py-0.5 text-[10px] font-bold text-white/70 hover:text-white"
                    aria-label="Reset zoom"
                    title="Reset zoom (fit)"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={zoomIn}
                    disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-25"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setShowInfo((v) => !v)}
                  className={cn(
                    'rounded-full p-1.5 hover:bg-white/10',
                    showInfo ? 'text-violet-400' : 'text-white/60 hover:text-white',
                  )}
                  aria-label="Story info"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleBookmark}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-violet-400"
                  aria-label="Bookmark"
                >
                  {bookmarked ? <BookmarkCheck className="h-4 w-4 text-violet-400" /> : <Bookmark className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setFullscreen((f) => !f)}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>

              {/* Story info panel (collapsible) */}
              {showInfo && (
                <div className="max-h-44 shrink-0 overflow-y-auto border-b border-white/10 bg-[#14121f] px-4 py-3">
                  <div className="mx-auto max-w-3xl space-y-2.5">
                    {story.translation?.introduction && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80">Introduction</h3>
                        <p className="mt-0.5 text-xs text-white/80">{story.translation.introduction}</p>
                      </div>
                    )}
                    {story.keyVerse && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80">Key Verse</h3>
                        <p className="mt-0.5 text-xs italic text-white/80">&ldquo;{story.keyVerse}&rdquo;</p>
                        <p className="text-[10px] text-amber-300">— {story.keyVerseRef}</p>
                      </div>
                    )}
                    {(story.translation?.lesson || story.lesson) && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80">What We Learn</h3>
                        <p className="mt-0.5 text-xs text-white/80">{story.translation?.lesson || story.lesson}</p>
                      </div>
                    )}
                    {(story.translation?.prayer || story.prayer) && (
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80">Prayer</h3>
                        <p className="mt-0.5 text-xs italic text-white/80">{story.translation?.prayer || story.prayer}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comic artwork canvas — fills all available space; artwork
                  is sized from the measured canvas (see ReaderImage) so it
                  uses ~90% of the width and the full height whenever the
                  aspect ratio permits. The scroll layer uses the
                  w-max/h-max + min-w-full/min-h-full pattern: artwork stays
                  centred when it fits AND remains fully reachable by scroll
                  when zoomed past the canvas edges. Prev/Next and the spread
                  badge live on the outer wrapper so they stay pinned over
                  the canvas viewport while scrolling. */}
              <div
                className={cn(
                  'relative bg-[#0d0d16]',
                  fullscreen ? 'min-h-0 flex-1' : 'h-[58vh] min-h-0 lg:h-auto lg:min-h-0 lg:flex-1',
                )}
              >
                <div ref={canvasRef} className="absolute inset-0 overflow-auto">
                  <div className="flex h-max min-h-full w-max min-w-full items-center justify-center gap-1 p-3">
                    {currentPages.map((page) => (
                      <ReaderImage
                        key={page.id}
                        page={page}
                        canvasW={canvasSize.w}
                        canvasH={canvasSize.h}
                        mode={currentView?.kind === 'pair' ? 'pair' : 'single'}
                        zoom={zoom}
                      />
                    ))}
                  </div>
                </div>

                {/* Two-page spread badge — reflects real asset metadata
                    (isSpread), never a count inferred from printed artwork. */}
                {currentView?.kind === 'spread' && (
                  <span className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300/90 ring-1 ring-amber-300/30 backdrop-blur-sm">
                    Two-page spread
                  </span>
                )}

                {/* Prev / Next overlays — hidden entirely when the story has
                    a single view (no dead controls on screen). */}
                {!singleView && (
                  <>
                    <button
                      onClick={goPrev}
                      disabled={viewIndex <= 0}
                      className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition-all hover:bg-violet-600 hover:ring-violet-400 disabled:pointer-events-none disabled:opacity-0"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={goNext}
                      disabled={viewIndex >= maxViewIndex}
                      className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/40 ring-1 ring-violet-400/40 backdrop-blur transition-all hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-0"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Bottom navigation bar */}
              <div className="relative z-10 flex shrink-0 items-center gap-3 border-t border-white/10 bg-[#14121f] px-3 py-2.5 sm:px-4">
                {/* Prev / Next only render when there is something to
                    navigate to — no permanently disabled dead buttons. */}
                {!singleView && (
                  <button
                    onClick={goPrev}
                    disabled={viewIndex <= 0}
                    className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                )}

                {/* Progress slider + counter */}
                <div className="flex flex-1 flex-col items-center gap-1">
                  {!singleView && (
                    <input
                      type="range"
                      min={1}
                      max={views.length}
                      value={viewIndex + 1}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10) - 1;
                        setViewIndex(idx);
                        const view = views[idx];
                        if (view) void saveProgress(view.firstPage);
                      }}
                      className="h-1 w-full max-w-sm cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500"
                      aria-label="Page slider"
                    />
                  )}
                  {singleView && progress > 0 && progress < 100 && (
                    <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-white/45">{label}</span>
                </div>

                {!singleView && (
                  <button
                    onClick={goNext}
                    disabled={viewIndex >= maxViewIndex}
                    className="flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-600/30 hover:bg-violet-500 disabled:opacity-30 disabled:shadow-none"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
