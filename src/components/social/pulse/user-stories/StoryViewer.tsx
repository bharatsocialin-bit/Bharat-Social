'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { useAuth } from '@/hooks/use-auth';
import { UserAvatar } from '@/components/social/UserAvatar';
import {
  STORY_BG_GRADIENT,
  type StoryDTO,
  type StoryGroupDTO,
} from '@/lib/pulse/user-stories';

// ============================================================================
// StoryViewer — full-screen Instagram-style carousel.
//
//   • Renders one row of progress bars across the top (one per story in the
//     current group).
//   • Auto-advances after 5s for text/link stories, 10s for photo, and the
//     video's natural duration for video stories.
//   • Tap left third = previous story, tap right third = next story, tap
//     center = pause/resume.
//   • When the last story of a group ends, advance to the next group; when
//     the last group ends, close.
//   • Records a view (POST /api/pulse/stories/user/[id]/view) the first
//     time each non-own story is shown.
// ============================================================================

const TEXT_DURATION_MS = 5000;
const PHOTO_DURATION_MS = 7000;
const VIDEO_DURATION_MS = 15000; // cap; video may end earlier

interface ViewerState {
  groups: StoryGroupDTO[];
  groupIndex: number;
  storyIndex: number;
  loading: boolean;
  error: string | null;
  // Per-story progress (0..1). Driven by requestAnimationFrame.
  progress: number;
  paused: boolean;
  // Story IDs we've already recorded a view for in this session.
  recordedViews: Set<string>;
}

function storyDurationMs(s: StoryDTO): number {
  if (s.kind === 'video') return VIDEO_DURATION_MS;
  if (s.kind === 'photo') return PHOTO_DURATION_MS;
  return TEXT_DURATION_MS;
}

export function StoryViewer() {
  const viewerState = useSocialStore((s) => s.storyViewerState);
  const closeStoryViewer = useSocialStore((s) => s.closeStoryViewer);
  const { user } = useAuth();

  const [state, setState] = useState<ViewerState>({
    groups: [],
    groupIndex: 0,
    storyIndex: 0,
    loading: true,
    error: null,
    progress: 0,
    paused: false,
    recordedViews: new Set(),
  });

  // Use refs for values that the rAF loop needs to read without re-subscribing.
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  // ── Fetch groups when the viewer opens ──
  useEffect(() => {
    if (!viewerState) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null, groups: [] }));
    fetch('/api/pulse/stories/user')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { groups: StoryGroupDTO[] }) => {
        if (cancelled) return;
        if (!data.groups || data.groups.length === 0) {
          setState((s) => ({
            ...s,
            loading: false,
            error: 'No stories to show.',
          }));
          return;
        }
        const startIndex = Math.max(0, Math.min(viewerState.startIndex, 0));
        const groupIndex = Math.max(
          0,
          data.groups.findIndex((g) => g.author.id === viewerState.authorId),
        );
        setState((s) => ({
          ...s,
          groups: data.groups,
          groupIndex: groupIndex >= 0 ? groupIndex : 0,
          storyIndex: startIndex,
          loading: false,
          progress: 0,
          recordedViews: new Set(),
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load stories.',
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [viewerState]);

  const currentGroup: StoryGroupDTO | null = state.groups[state.groupIndex] ?? null;
  const currentStory: StoryDTO | null = currentGroup?.stories[state.storyIndex] ?? null;

  // ── Record view (fire-and-forget, only once per story) ──
  const recordView = useCallback(
    (storyId: string, isOwn: boolean) => {
      if (isOwn) return;
      setState((s) => {
        if (s.recordedViews.has(storyId)) return s;
        const next = new Set(s.recordedViews);
        next.add(storyId);
        return { ...s, recordedViews: next };
      });
      // Fire-and-forget.
      fetch(`/api/pulse/stories/user/${storyId}/view`, { method: 'POST' }).catch(() => {});
    },
    [],
  );

  // ── Advance helper ──
  const advance = useCallback(
    (direction: 'next' | 'prev') => {
      setState((s) => {
        if (s.groups.length === 0) return s;
        let g = s.groupIndex;
        let i = s.storyIndex + (direction === 'next' ? 1 : -1);
        if (i < 0) {
          // Move to previous group, last story.
          g -= 1;
          if (g < 0) {
            // No more groups backwards — close.
            closeStoryViewer();
            return s;
          }
          i = (s.groups[g]?.stories.length ?? 1) - 1;
        } else if (i >= (s.groups[g]?.stories.length ?? 0)) {
          // Move to next group, first story.
          g += 1;
          if (g >= s.groups.length) {
            closeStoryViewer();
            return s;
          }
          i = 0;
        }
        return { ...s, groupIndex: g, storyIndex: i, progress: 0 };
      });
    },
    [closeStoryViewer],
  );

  // ── Record view when story changes ──
  useEffect(() => {
    if (!currentStory || !currentGroup) return;
    recordView(currentStory.id, currentGroup.isOwn);
  }, [currentStory, currentGroup, recordView]);

  // ── Progress animation loop ──
  useEffect(() => {
    if (!currentStory || state.paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    // Reset progress and timer whenever story changes.
    startTsRef.current = performance.now();
    elapsedBeforePauseRef.current = 0;
    pausedAtRef.current = null;
    const duration = storyDurationMs(currentStory);

    const tick = (now: number) => {
      const elapsed = elapsedBeforePauseRef.current + (now - startTsRef.current);
      const p = Math.min(1, elapsed / duration);
      setState((s) => ({ ...s, progress: p }));
      if (p >= 1) {
        advance('next');
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentStory?.id, state.paused]);

  // ── Keyboard nav ──
  useEffect(() => {
    if (!currentStory) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStoryViewer();
      else if (e.key === 'ArrowLeft') advance('prev');
      else if (e.key === 'ArrowRight') advance('next');
      else if (e.key === ' ') {
        e.preventDefault();
        setState((s) => ({ ...s, paused: !s.paused }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentStory, closeStoryViewer, advance]);

  // ── Pause handler — preserves elapsed progress ──
  const togglePause = useCallback(() => {
    setState((s) => {
      if (!s.paused) {
        // Pausing — stash elapsed.
        pausedAtRef.current = performance.now();
        elapsedBeforePauseRef.current += pausedAtRef.current - startTsRef.current;
        return { ...s, paused: true };
      }
      // Resuming — reset start timestamp.
      startTsRef.current = performance.now();
      pausedAtRef.current = null;
      return { ...s, paused: false };
    });
  }, []);

  // ── Delete own story ──
  const [deleting, setDeleting] = useState(false);
  const handleDelete = useCallback(async () => {
    if (!currentStory) return;
    if (!confirm('Delete this story? It will be removed immediately.')) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/pulse/stories/user/${currentStory.id}`, {
        method: 'DELETE',
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(d.error || 'Failed to delete story.');
        return;
      }
      // Remove from local state and either advance or close.
      setState((s) => {
        const newGroups = s.groups
          .map((g, gi) =>
            gi === s.groupIndex
              ? {
                  ...g,
                  stories: g.stories.filter((_, i) => i !== s.storyIndex),
                }
              : g,
          )
          .filter((g) => g.stories.length > 0);
        if (newGroups.length === 0) {
          closeStoryViewer();
          return s;
        }
        const newGroupIndex = Math.min(s.groupIndex, newGroups.length - 1);
        const newStoryIndex = Math.min(
          s.storyIndex,
          (newGroups[newGroupIndex]?.stories.length ?? 1) - 1,
        );
        return {
          ...s,
          groups: newGroups,
          groupIndex: newGroupIndex,
          storyIndex: newStoryIndex,
          progress: 0,
        };
      });
    } finally {
      setDeleting(false);
    }
  }, [currentStory, closeStoryViewer]);

  // ── Render ──
  if (!viewerState) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Close */}
      <button
        onClick={closeStoryViewer}
        aria-label="Close"
        className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {state.loading ? (
        <div className="flex flex-col items-center gap-3 text-white/80">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading stories…</p>
        </div>
      ) : state.error ? (
        <div className="flex flex-col items-center gap-3 text-white/80">
          <p className="text-sm">{state.error}</p>
          <button
            onClick={closeStoryViewer}
            className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Close
          </button>
        </div>
      ) : currentStory && currentGroup ? (
        <div className="relative flex h-full w-full max-w-md flex-col">
          {/* Progress bars */}
          <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3">
            {currentGroup.stories.map((s, i) => (
              <div
                key={s.id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width:
                      i < state.storyIndex
                        ? '100%'
                        : i > state.storyIndex
                          ? '0%'
                          : `${state.progress * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header (author + timestamp) */}
          <div className="absolute left-0 right-0 top-7 z-20 flex items-center gap-2 px-4 pt-2">
            <UserAvatar
              user={{
                name: currentGroup.author.name || currentGroup.author.username,
                initials: currentGroup.author.initials,
                avatarGradient: currentGroup.author.avatarGradient,
                avatarUrl: currentGroup.author.avatarUrl,
              }}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {currentGroup.author.name || `@${currentGroup.author.username}`}
              </p>
              <p className="text-[11px] text-white/60">
                {formatRelativeTime(currentStory.createdAt)}
                {currentGroup.isOwn && ' · Your story'}
              </p>
            </div>
            {currentGroup.isOwn && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete story"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500/80 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Tap zones */}
          <button
            onClick={() => advance('prev')}
            aria-label="Previous story"
            className="absolute left-0 top-0 z-10 h-full w-1/3 cursor-default"
          />
          <button
            onClick={togglePause}
            aria-label={state.paused ? 'Resume' : 'Pause'}
            className="absolute left-1/3 top-0 z-10 h-full w-1/3"
          />
          <button
            onClick={() => advance('next')}
            aria-label="Next story"
            className="absolute right-0 top-0 z-10 h-full w-1/3 cursor-default"
          />

          {/* Side arrows (desktop) */}
          {state.groupIndex > 0 || state.storyIndex > 0 ? (
            <button
              onClick={() => advance('prev')}
              aria-label="Previous"
              className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}
          <button
            onClick={() => advance('next')}
            aria-label="Next"
            className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 md:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Story content */}
          <StoryCanvas story={currentStory} paused={state.paused} />

          {/* Pause indicator */}
          {state.paused && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/80">
                Paused
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Story content canvas ──────────────────────────────────────────────────

function StoryCanvas({ story, paused }: { story: StoryDTO; paused: boolean }) {
  if (story.kind === 'text') {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-gradient-to-br p-8 text-center',
          STORY_BG_GRADIENT[story.backgroundColor],
        )}
      >
        <p
          className={cn(
            'whitespace-pre-wrap text-2xl font-semibold leading-relaxed',
            story.textColor === 'black' ? 'text-black' : 'text-white',
          )}
        >
          {story.textContent}
        </p>
      </div>
    );
  }
  if (story.kind === 'photo') {
    return (
      <div className="relative h-full w-full bg-black">
        {story.mediaUrl && (
          <img
            src={story.mediaUrl}
            alt={story.textContent || 'Story photo'}
            className="h-full w-full object-contain"
            referrerPolicy="no-referrer"
          />
        )}
        {story.textContent && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="text-base text-white">{story.textContent}</p>
          </div>
        )}
      </div>
    );
  }
  if (story.kind === 'video') {
    return (
      <div className="relative h-full w-full bg-black">
        {story.mediaUrl && (
          <video
            src={story.mediaUrl}
            className="h-full w-full object-contain"
            autoPlay
            muted={paused}
            playsInline
            loop={false}
            // Pause when the viewer is paused.
            {...(paused ? { paused: true } : {})}
          />
        )}
        {story.textContent && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="text-base text-white">{story.textContent}</p>
          </div>
        )}
      </div>
    );
  }
  // link
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-br p-8 text-center',
        STORY_BG_GRADIENT[story.backgroundColor],
      )}
    >
      {story.textContent && (
        <p
          className={cn(
            'text-xl font-semibold leading-relaxed',
            story.textColor === 'black' ? 'text-black' : 'text-white',
          )}
        >
          {story.textContent}
        </p>
      )}
      {story.linkPreview && (
        <a
          href={story.linkUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-sm overflow-hidden rounded-xl bg-white/10 text-left backdrop-blur hover:bg-white/20"
        >
          {story.linkPreview.image && (
            <img
              src={story.linkPreview.image}
              alt=""
              className="h-32 w-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="p-3">
            {story.linkPreview.title && (
              <p className="line-clamp-2 text-sm font-semibold text-white">
                {story.linkPreview.title}
              </p>
            )}
            {story.linkPreview.description && (
              <p className="mt-1 line-clamp-2 text-xs text-white/70">
                {story.linkPreview.description}
              </p>
            )}
            <p className="mt-2 flex items-center gap-1 text-[11px] text-white/60">
              <ExternalLink className="h-3 w-3" />
              {story.linkPreview.siteName || story.linkUrl}
            </p>
          </div>
        </a>
      )}
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}
