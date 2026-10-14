'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Loader2, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { UserAvatar } from '@/components/social/UserAvatar';
import { EmptyState } from '@/components/social/EmptyState';
import {
  STORY_BG_GRADIENT,
  type StoryDTO,
  type StoryBgKey,
} from '@/lib/pulse/user-stories';

// ============================================================================
// StoryArchive — modal showing the creator's OWN archived stories from the
// last 7 days. Read-only (stories can't be un-archived). Hard-delete is
// available since they're already past the live window.
// ============================================================================

export function StoryArchive() {
  const open = useSocialStore((s) => s.storyArchiveOpen);
  const setOpen = useSocialStore((s) => s.setStoryArchiveOpen);
  const [stories, setStories] = useState<StoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/pulse/stories/user/archive')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { stories: StoryDTO[] }) => {
        if (cancelled) return;
        setStories(data.stories ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load archive.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const cancel = load();
    return cancel;
  }, [open, load]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Permanently delete this archived story?')) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/pulse/stories/user/${id}`, { method: 'DELETE' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(d.error || 'Failed to delete.');
        return;
      }
      setStories((s) => s.filter((x) => x.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col bg-background text-foreground md:h-[90vh] md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-saffron" />
            <h2 className="text-sm font-semibold">My Archive</h2>
            <span className="text-[11px] text-muted-foreground">
              · last 7 days
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-saffron" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-400">{error}</p>
          ) : stories.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No archived stories"
              description="Stories you've posted in the last 7 days will appear here after they expire."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stories.map((s) => (
                <div
                  key={s.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[9/16] w-full">
                    <ArchiveThumb story={s} />
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-2">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar
                        user={{
                          name: s.author.name || s.author.username,
                          initials: s.author.initials,
                          avatarGradient: s.author.avatarGradient,
                          avatarUrl: s.author.avatarUrl,
                        }}
                        size="sm"
                      />
                    </div>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      aria-label="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500/80 disabled:opacity-50"
                    >
                      {deletingId === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  {/* Footer */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-[10px] text-white/80">
                      {s.viewCount} view{s.viewCount === 1 ? '' : 's'}
                    </p>
                    <p className="text-[10px] text-white/60">
                      {formatArchiveDate(s.archivedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveThumb({ story }: { story: StoryDTO }) {
  if (story.kind === 'photo' && story.mediaUrl) {
    return (
      <img
        src={story.mediaUrl}
        alt=""
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  if (story.kind === 'video' && story.mediaUrl) {
    return (
      <div className="relative h-full w-full bg-black">
        <video
          src={story.mediaUrl}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <span className="absolute left-1 top-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-white">
          VIDEO
        </span>
      </div>
    );
  }
  if (story.kind === 'text' || story.kind === 'link') {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-gradient-to-br p-3 text-center',
          STORY_BG_GRADIENT[story.backgroundColor as StoryBgKey],
        )}
      >
        <p
          className={cn(
            'line-clamp-5 text-xs font-semibold',
            story.textColor === 'black' ? 'text-black' : 'text-white',
          )}
        >
          {story.kind === 'link'
            ? story.linkPreview?.title || story.linkUrl
            : story.textContent}
        </p>
      </div>
    );
  }
  return null;
}

function formatArchiveDate(iso: string | null): string {
  if (!iso) return '';
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
