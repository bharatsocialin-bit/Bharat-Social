'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, Film, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useSocialStore } from '@/store/useSocialStore';
import { useAuth } from '@/hooks/use-auth';
import { EmptyState } from '@/components/social/EmptyState';
import { ShortCard, type ShortItem } from './ShortCard';
import { ShortsUploadDialog } from './ShortsUploadDialog';
import { AuthDialog } from '@/components/auth/AuthDialog';

/**
 * Shorts feed — full-viewport vertical video scroller.
 *
 * Fetches real shorts from the database via `/api/shorts`. Demonstrates
 * loading, empty, and error states. One video is visible at a time.
 * Uses CSS scroll-snap for the swipe behaviour and an IntersectionObserver
 * to detect which card is active so we can autoplay/pause accordingly.
 *
 * Accessibility: respects prefers-reduced-motion by NOT autoplaying
 * videos when the user has that preference set.
 */
const PAGE_SIZE = 5;

export function ShortsView() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { isAuthenticated } = useAuth();

  // Reset auth + upload state when needed by other components.
  useSocialStore((s) => s.shortsMuted); // subscribe so muted toggle re-renders cards

  // Detect prefers-reduced-motion.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const raf = requestAnimationFrame(() => setPrefersReducedMotion(mq.matches));
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener('change', handler);
    };
  }, []);

  // Fetch the first page of shorts.
  const fetchShorts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shorts?limit=' + PAGE_SIZE);
      if (!res.ok) throw new Error('Failed to fetch shorts');
      const data = await res.json();
      setShorts(data.shorts || []);
      setCursor(data.nextCursor || null);
      setHasMore(!!data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shorts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShorts();
  }, [fetchShorts]);

  // Load more when the user scrolls near the bottom.
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/shorts?limit=${PAGE_SIZE}&cursor=${cursor}`);
      if (!res.ok) throw new Error('Failed to load more shorts');
      const data = await res.json();
      setShorts((prev) => [...prev, ...(data.shorts || [])]);
      setCursor(data.nextCursor || null);
      setHasMore(!!data.nextCursor);
    } catch (e) {
      console.error('Failed to load more:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

  // IntersectionObserver — track active card, and load more when near the end.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || shorts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
              // Load more when we get within 2 cards of the end.
              if (idx >= shorts.length - 2) {
                loadMore();
              }
            }
          }
        });
      },
      { root: container, threshold: 0.6 },
    );

    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [shorts.length, loadMore]);

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    [],
  );

  // Handle short deletion from a card — remove from the local list.
  function handleShortDeleted(shortId: string) {
    setShorts((prev) => prev.filter((s) => s.id !== shortId));
  }

  function handleShortUploaded() {
    // Re-fetch the first page so the new short shows up at the top.
    fetchShorts();
  }

  function handleUploadClick() {
    if (!isAuthenticated) {
      setAuthMode('login');
      setAuthOpen(true);
    } else {
      setUploadOpen(true);
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-full flex-col bg-black">
        <ShortsHeader onUpload={handleUploadClick} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-saffron" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex h-full flex-col bg-black">
        <ShortsHeader onUpload={handleUploadClick} />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
            <h2 className="mt-3 text-lg font-semibold text-white">Couldn’t load shorts</h2>
            <p className="mt-1 text-sm text-white/60">{error}</p>
            <button
              type="button"
              onClick={fetchShorts}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (shorts.length === 0) {
    return (
      <div className="flex h-full flex-col bg-black">
        <ShortsHeader onUpload={handleUploadClick} />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Film}
            title="No Shorts yet"
            description="Be the first to share a short video on BharatSocial. Upload an MP4, WebM, or MOV file (max 50 MB, 3 minutes)."
            action={
              <button
                type="button"
                onClick={handleUploadClick}
                className="rounded-full bg-saffron px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-saffron/20 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Upload a Short
              </button>
            }
          />
        </div>
        <ShortsUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploaded={handleShortUploaded}
        />
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-black">
      <ShortsHeader onUpload={handleUploadClick} />

      {/* Vertical snap-scrolling video feed */}
      <div
        ref={containerRef}
        className="hide-scrollbar h-[calc(100vh-3.5rem)] w-full snap-y-mandatory overflow-y-scroll bg-black md:h-[calc(100vh-0rem)]"
        aria-label="Shorts feed — swipe to scroll"
      >
        {shorts.map((video, index) => (
          <div
            key={video.id}
            ref={setCardRef(index)}
            data-index={index}
            className="h-[calc(100vh-3.5rem)] w-full snap-start md:h-screen"
          >
            <ShortCard
              video={video}
              isActive={activeIndex === index && !prefersReducedMotion}
              onDeleted={() => handleShortDeleted(video.id)}
            />
          </div>
        ))}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex h-24 items-center justify-center bg-black">
            <Loader2 className="h-6 w-6 animate-spin text-saffron" />
          </div>
        )}

        {/* End-of-feed sentinel */}
        {!hasMore && shorts.length > 0 && (
          <div className="flex h-32 items-center justify-center bg-black px-6 text-center">
            <p className="text-xs text-white/40">You’ve reached the end. No more shorts to load.</p>
          </div>
        )}
      </div>

      <ShortsUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={handleShortUploaded}
      />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} />
    </div>
  );
}

function ShortsHeader({ onUpload }: { onUpload: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-white/10 bg-black px-4 py-2.5 text-white">
      <h1 className="flex items-center gap-2 text-base font-bold">
        <Film className="h-5 w-5 text-saffron" />
        Shorts
      </h1>
      <p className="hidden text-xs text-white/60 sm:inline">
        Swipe to scroll · tap to play/pause ·{' '}
        <span className="text-white/40">videos are stored locally (development)</span>
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-saffron px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <Upload className="h-4 w-4" />
        Upload
      </button>
    </header>
  );
}
