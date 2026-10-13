'use client';

import { Search, X, Feather } from 'lucide-react';
import { useSocialStore } from '@/store/useSocialStore';
import { LogoMark } from './Logo';

interface MobileHeaderProps {
  onCompose: () => void;
}

export function MobileHeader({ onCompose }: MobileHeaderProps) {
  const searchQuery = useSocialStore((s) => s.searchQuery);
  const setSearchQuery = useSocialStore((s) => s.setSearchQuery);
  const activeNav = useSocialStore((s) => s.activeNav);

  const titles: Record<string, string> = {
    home: 'BharatSocial',
    explore: 'Explore',
    pulse: 'India Pulse',
    feed: 'Feed',
    shorts: 'Shorts',
    quiz: 'India Quiz',
    notifications: 'Notifications',
    messages: 'Messages',
    bookmarks: 'Bookmarks',
    profile: 'Profile',
    settings: 'Settings',
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-sidebar-border bg-sidebar/90 px-3 py-2.5 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <LogoMark className="h-8 w-8" />
        <h1 className="text-base font-bold text-white">{titles[activeNav] ?? 'BharatSocial'}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 transition-colors focus-within:border-saffron focus-within:bg-card focus-within:ring-2 focus-within:ring-saffron/20">
          <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            type="search"
            className="w-32 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="rounded-full p-0.5 text-muted-foreground hover:bg-saffron-soft hover:text-saffron focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onCompose}
          aria-label="Create a new post"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron text-white shadow-soft transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Feather className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
