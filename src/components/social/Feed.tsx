'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSocialStore, useFilteredPosts } from '@/store/useSocialStore';
import type { FeedTab, DemoPost } from '@/lib/types';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { EmptyState } from './EmptyState';
import { Sparkles, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'for-you', label: 'For You' },
  { key: 'following', label: 'Following' },
];

interface FeedProps {
  composerRef: React.RefObject<{ focus: () => void; activate: () => void } | null>;
}

export function Feed({ composerRef }: FeedProps) {
  const feedTab = useSocialStore((s) => s.feedTab);
  const setFeedTab = useSocialStore((s) => s.setFeedTab);
  const searchQuery = useSocialStore((s) => s.searchQuery);
  const demoPosts = useFilteredPosts();
  const { isAuthenticated } = useAuth();
  const [dbPosts, setDbPosts] = useState<DemoPost[] | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Load real posts from DB when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setDbPosts(null);
      return;
    }

    async function loadPosts() {
      setDbLoading(true);
      try {
        const res = await fetch(`/api/posts?following=${feedTab === 'following'}`);
        if (res.ok) {
          const data = await res.json();
          setDbPosts(data.posts);
        }
      } catch {
        // Fall back to demo posts
      } finally {
        setDbLoading(false);
      }
    }
    loadPosts();
  }, [isAuthenticated, feedTab]);

  // Determine which posts to show
  const posts = isAuthenticated && dbPosts ? dbPosts : demoPosts;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header — sticky with tabs */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <h1 className="px-4 pt-3 text-lg font-bold text-white">Feed</h1>
        <div role="tablist" aria-label="Feed view" className="flex">
          {TABS.map(({ key, label }) => {
            const active = feedTab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setFeedTab(key)}
                className="group relative flex-1 px-4 py-3 text-sm font-medium transition-colors hover:bg-saffron-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-saffron"
              >
                <span className={cn(active ? 'text-white font-semibold' : 'text-white/50')}>
                  {label}
                </span>
                <span
                  className={cn(
                    'absolute inset-x-0 -bottom-px h-[3px] bg-saffron transition-transform',
                    active ? 'scale-x-100' : 'scale-x-0',
                  )}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </header>

      <PostComposer ref={composerRef} variant="inline" />

      {/* Loading state for DB posts */}
      {dbLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-saffron" />
        </div>
      )}

      {/* Search-aware empty state */}
      {!dbLoading && posts.length === 0 ? (
        <EmptyState
          icon={feedTab === 'following' ? Users : Sparkles}
          title={searchQuery ? `No posts match "${searchQuery}"` : 'Nothing here yet'}
          description={
            searchQuery
              ? 'Try a different keyword, or clear the search to see the whole feed.'
              : feedTab === 'following'
                ? 'Follow some accounts to see their posts in this view.'
                : 'Be the first to post on Desily.'
          }
          className="min-h-[40vh]"
        />
      ) : (
        !dbLoading && (
          <div>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {isAuthenticated && dbPosts
                ? "You've reached the end of the feed."
                : 'Demonstration posts — log in to see and create real posts.'}
            </div>
          </div>
        )
      )}
    </div>
  );
}
