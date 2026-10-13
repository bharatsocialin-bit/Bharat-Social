'use client';

import { Search, TrendingUp, BadgeCheck, MoreHorizontal, X, Activity, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { DEMO_TRENDING, DEMO_SUGGESTED } from '@/data/explore';
import { DEMO_USER_MAP } from '@/data/users';
import { formatCount } from '@/lib/format';
import { UserAvatar } from './UserAvatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface SearchResult {
  id: string;
  username: string;
  name: string;
  avatarGradient: string;
  initials: string;
  bio: string | null;
}

export function RightSidebar() {
  const searchQuery = useSocialStore((s) => s.searchQuery);
  const setSearchQuery = useSocialStore((s) => s.setSearchQuery);
  const setActiveNav = useSocialStore((s) => s.setActiveNav);
  const followingIds = useSocialStore((s) => s.followingIds);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const openProfile = useSocialStore((s) => s.openProfile);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Real search when authenticated
  useEffect(() => {
    if (!isAuthenticated || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users);
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isAuthenticated, searchQuery]);

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col gap-4 px-4 py-4 xl:flex">
      {/* Search */}
      <div className="sticky top-0 z-10 -mx-1 bg-background/80 px-1 py-1 backdrop-blur">
        <label htmlFor="explore-search" className="sr-only">
          Search BharatSocial
        </label>
        <div className="group flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2.5 transition-colors focus-within:border-saffron focus-within:bg-card focus-within:ring-2 focus-within:ring-saffron/20">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            id="explore-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search BharatSocial"
            className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
            type="search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-saffron-soft hover:text-saffron focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search results (real DB search for authenticated users) */}
      {isAuthenticated && searchQuery.trim() && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <h2 className="px-4 pt-4 text-sm font-bold text-white">
            Search Results
          </h2>
          {searchLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-saffron" />
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <ul className="mt-2">
              {searchResults.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-saffron-soft/20">
                  <button
                    type="button"
                    onClick={() => openProfile(u.id)}
                    className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white', u.avatarGradient)}>
                      {u.initials}
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openProfile(u.id)}
                      className="block truncate text-sm font-semibold text-white hover:underline"
                    >
                      {u.name}
                    </button>
                    <p className="truncate text-sm text-muted-foreground">@{u.username}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !searchLoading && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No users found for "{searchQuery}"
              </p>
            )
          )}
        </section>
      )}

      {/* India Pulse city updates */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <header className="flex items-center justify-between px-4 pt-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Activity className="h-4 w-4 text-india-green" />
            India Pulse
          </h2>
          <button
            type="button"
            onClick={() => setActiveNav('pulse')}
            className="text-xs font-medium text-saffron hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
          >
            See all
          </button>
        </header>
        <div className="px-4 pb-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Local conversations from cities across India
          </p>
          <button
            type="button"
            onClick={() => setActiveNav('pulse')}
            className="mt-2 w-full rounded-lg bg-india-green-soft px-3 py-2 text-left text-sm font-medium text-india-green transition-colors hover:bg-india-green hover:text-white"
          >
            Explore city updates →
          </button>
        </div>
      </section>

      {/* Trending */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <header className="flex items-center justify-between px-4 pt-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <TrendingUp className="h-4 w-4 text-saffron" />
            Trending in India
          </h2>
          <button
            type="button"
            aria-label="See more trends"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-saffron-soft hover:text-saffron focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </header>
        <ul className="mt-2">
          {DEMO_TRENDING.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery(t.title.replace('#', ''));
                  setActiveNav('feed');
                  toast({
                    title: `Searching for “${t.title}”`,
                    description: 'The feed is filtered by this trending topic.',
                  });
                }}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-saffron-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-saffron"
              >
                <span className="text-xs text-muted-foreground">{t.category}</span>
                <span className="text-sm font-semibold text-white">{t.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCount(t.postsCount)} posts
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setActiveNav('explore')}
          className="w-full px-4 py-3 text-left text-sm text-saffron transition-colors hover:bg-saffron-soft/30"
        >
          Show more
        </button>
      </section>

      {/* Suggested accounts */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <h2 className="px-4 pt-4 text-base font-bold text-white">
          Suggested creators
        </h2>
        <ul className="mt-2">
          {DEMO_SUGGESTED.map(({ userId, reason }) => {
            const user = DEMO_USER_MAP[userId];
            if (!user) return null;
            const isFollowing = followingIds.has(user.id);
            return (
              <li
                key={userId}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-saffron-soft/20"
              >
                <button
                  type="button"
                  onClick={() => openProfile(user.id)}
                  className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  aria-label={`Open ${user.name}’s profile`}
                >
                  <UserAvatar user={user} size="md" />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => openProfile(user.id)}
                    className="flex items-center gap-1 text-left hover:underline"
                  >
                    <span className="truncate text-sm font-semibold text-white">
                      {user.name}
                    </span>
                    {user.verified && (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-saffron" aria-label="Verified" />
                    )}
                  </button>
                  <p className="truncate text-sm text-muted-foreground">@{user.handle}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleFollow(user.id);
                    toast({
                      title: isFollowing ? `Unfollowed ${user.name}` : `Following ${user.name}`,
                      description: 'Demonstration only — no real follow relationship is created.',
                    });
                  }}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isFollowing
                      ? 'border border-border text-white hover:border-destructive/40 hover:text-destructive'
                      : 'bg-saffron text-white hover:brightness-105',
                  )}
                  aria-pressed={isFollowing}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setActiveNav('explore')}
          className="w-full px-4 py-3 text-left text-sm text-saffron transition-colors hover:bg-saffron-soft/30"
        >
          Show more
        </button>
      </section>

      {/* Footer with tricolor accent */}
      <footer className="px-2 pb-6 text-xs text-muted-foreground">
        <div className="mb-2 h-1 overflow-hidden rounded-full">
          <div className="h-full bg-tricolor-horizontal opacity-50" />
        </div>
        <nav className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Footer">
          <a href="#" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">About</a>
          <a href="#" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Privacy</a>
          <a href="#" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Terms</a>
          <a href="#" className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Help</a>
        </nav>
        <p className="mt-2" suppressHydrationWarning>
          © {new Date().getFullYear()} BharatSocial. Demonstration prototype.
        </p>
      </footer>
    </aside>
  );
}
