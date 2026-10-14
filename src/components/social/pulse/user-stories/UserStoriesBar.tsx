'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Layers, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { useAuth } from '@/hooks/use-auth';
import { UserAvatar } from '@/components/social/UserAvatar';
import { EmptyState } from '@/components/social/EmptyState';
import type { StoryGroupDTO } from '@/lib/pulse/user-stories';

// ============================================================================
// UserStoriesBar — horizontal avatar rail shown above the Pulse content.
//
//   • First slot: the current user's own "Add story" tile (or sign-in CTA
//     for anonymous visitors).
//   • Subsequent slots: one avatar per author who has live stories. A
//     saffron ring around the avatar means there are un-viewed stories; a
//     muted ring means the user has seen them all.
//   • Clicking an avatar opens the StoryViewer at that author's first story.
// ============================================================================

export function UserStoriesBar() {
  const { isAuthenticated, user } = useAuth();
  const openStoryViewer = useSocialStore((s) => s.openStoryViewer);
  const setStoryCreatorOpen = useSocialStore((s) => s.setStoryCreatorOpen);
  const setStoryArchiveOpen = useSocialStore((s) => s.setStoryArchiveOpen);

  const [groups, setGroups] = useState<StoryGroupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // setState calls inside .then/.catch/.finally are NOT synchronous
    // (they run as microtask callbacks), so the lint rule about calling
    // setState synchronously inside an effect body does not apply.
    // Initial `loading=true` (set via useState initial state) means we
    // don't need a sync setLoading(true) at the top of the effect.
    fetch('/api/pulse/stories/user')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data: { groups: StoryGroupDTO[] }) => {
        if (cancelled) return;
        setGroups(data.groups ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load stories.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ownGroup = groups.find((g) => g.isOwn) ?? null;
  const otherGroups = groups.filter((g) => !g.isOwn);

  return (
    <section className="border-b border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          <Layers className="h-3.5 w-3.5 text-saffron" />
          User Stories
          <span className="text-[10px] font-normal text-white/40">· live 24h</span>
        </h2>
        {isAuthenticated && (
          <button
            onClick={() => setStoryArchiveOpen(true)}
            className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white"
          >
            <Archive className="h-3 w-3" />
            Archive
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 px-1 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-saffron" />
          <span className="text-xs text-muted-foreground">Loading stories…</span>
        </div>
      ) : error ? (
        <p className="px-1 py-2 text-xs text-red-400">{error}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {/* Own story tile */}
          {isAuthenticated ? (
            <button
              onClick={() => {
                if (ownGroup) {
                  openStoryViewer(ownGroup.author.id, 0);
                } else {
                  setStoryCreatorOpen(true);
                }
              }}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-saffron/30 to-amber-600/30 p-0.5">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                    {user ? (
                      <span className="text-sm font-bold text-foreground">
                        You
                      </span>
                    ) : (
                      <Plus className="h-5 w-5 text-foreground" />
                    )}
                  </div>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-saffron text-white shadow ring-2 ring-background">
                  <Plus className="h-3 w-3" />
                </span>
              </div>
              <span className="w-full truncate text-center text-[10px] text-white/70">
                {ownGroup ? 'Your story' : 'Add story'}
              </span>
            </button>
          ) : null}

          {/* Other authors */}
          {otherGroups.length === 0 && !ownGroup ? (
            <div className="flex-1">
              <EmptyState
                icon={Layers}
                title="No live stories yet"
                description={
                  isAuthenticated
                    ? 'Be the first — post a story and it will appear here for 24 hours.'
                    : 'Sign in to post your own story.'
                }
                className="px-2 py-4"
              />
            </div>
          ) : (
            otherGroups.map((g) => (
              <button
                key={g.author.id}
                onClick={() => openStoryViewer(g.author.id, 0)}
                className="flex w-16 shrink-0 flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    'rounded-full bg-gradient-to-br p-0.5',
                    g.allViewed
                      ? 'from-white/20 to-white/10'
                      : 'from-saffron via-amber-500 to-saffron',
                  )}
                >
                  <div className="rounded-full bg-background p-0.5">
                    <UserAvatar
                      user={{
                        name: g.author.name || g.author.username,
                        initials: g.author.initials,
                        avatarGradient: g.author.avatarGradient,
                        avatarUrl: g.author.avatarUrl,
                      }}
                      size="md"
                    />
                  </div>
                </div>
                <span className="w-full truncate text-center text-[10px] text-white/70">
                  @{g.author.username}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
}
