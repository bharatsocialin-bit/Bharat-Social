'use client';

import {
  Bell,
  Bookmark,
  Mail,
  Settings as SettingsIcon,
  Compass,
  Search,
  TrendingUp,
  BadgeCheck,
  Sparkles,
  Languages,
} from 'lucide-react';
import { useMemo } from 'react';
import { useSocialStore } from '@/store/useSocialStore';
import { DEMO_TRENDING, DEMO_SUGGESTED } from '@/data/explore';
import { DEMO_USER_MAP } from '@/data/users';
import { formatCount } from '@/lib/format';
import { UserAvatar } from './UserAvatar';
import { EmptyState } from './EmptyState';
import { PostCard } from './PostCard';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { NavKey, Language } from '@/lib/types';
import { languageLabel } from '@/lib/format';

interface PanelShellProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  description?: string;
}

function PanelShell({ title, icon: Icon, children, description }: PanelShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Icon className="h-5 w-5 text-brand" />
          {title}
        </h1>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TrendingList() {
  const setSearchQuery = useSocialStore((s) => s.setSearchQuery);
  const setActiveNav = useSocialStore((s) => s.setActiveNav);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <h2 className="flex items-center gap-2 px-4 pt-4 text-base font-semibold text-foreground">
        <TrendingUp className="h-4 w-4 text-brand" />
        Trending in India
      </h2>
      <ul className="mt-2">
        {DEMO_TRENDING.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                setSearchQuery(t.title.replace('#', ''));
                setActiveNav('home');
              }}
              className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="text-xs text-muted-foreground">{t.category}</span>
              <span className="text-sm font-semibold text-foreground">{t.title}</span>
              <span className="text-xs text-muted-foreground">
                {formatCount(t.postsCount)} posts
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SuggestedAccountsList() {
  const followingIds = useSocialStore((s) => s.followingIds);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const openProfile = useSocialStore((s) => s.openProfile);
  const { toast } = useToast();

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <h2 className="flex items-center gap-2 px-4 pt-4 text-base font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-brand" />
        Who to follow
      </h2>
      <ul className="mt-2">
        {DEMO_SUGGESTED.map(({ userId, reason }) => {
          const user = DEMO_USER_MAP[userId];
          if (!user) return null;
          const isFollowing = followingIds.has(user.id);
          return (
            <li
              key={userId}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent"
            >
              <button
                type="button"
                onClick={() => openProfile(user.id)}
                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <span className="truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  {user.verified && (
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Verified" />
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
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isFollowing
                    ? 'border border-border bg-card text-foreground hover:border-destructive/40 hover:text-destructive'
                    : 'bg-brand text-brand-foreground hover:brightness-105',
                )}
                aria-pressed={isFollowing}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BookmarksPanel() {
  // Subscribe to the posts array (stable reference) and derive the
  // bookmarked subset with useMemo. Returning a freshly-filtered array
  // directly from the selector would trigger Zustand's
  // "getSnapshot should be cached" infinite-loop warning.
  const posts = useSocialStore((s) => s.posts);
  const bookmarkedPosts = useMemo(
    () => posts.filter((p) => p.bookmarked),
    [posts],
  );

  if (bookmarkedPosts.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No bookmarks yet"
        description="Tap the ··· menu on any post and choose “Save to bookmarks”. This prototype stores bookmarks only for this session."
      />
    );
  }
  return (
    <div>
      {bookmarkedPosts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

export function NavPanel({ navKey }: { navKey: NavKey }) {
  const setSearchQuery = useSocialStore((s) => s.setSearchQuery);
  const { toast } = useToast();

  if (navKey === 'explore') {
    return (
      <PanelShell
        title="Explore"
        icon={Compass}
        description="Trends, topics and people from across India."
      >
        <div className="space-y-4 p-4">
          <label htmlFor="explore-inline-search" className="sr-only">
            Search Desily
          </label>
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2.5 transition-colors focus-within:border-brand focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/20">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              id="explore-inline-search"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try ‘cricket’, ‘food’, ‘Hyderabad’…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              type="search"
            />
          </div>

          <TrendingList />
          <SuggestedAccountsList />
        </div>
      </PanelShell>
    );
  }

  if (navKey === 'notifications') {
    return (
      <PanelShell title="Notifications" icon={Bell}>
        <EmptyState
          icon={Bell}
          title="You’re all caught up"
          description="When people react or reply to your posts, you’ll see it here. This is a demonstration only — no notifications are stored."
        />
      </PanelShell>
    );
  }

  if (navKey === 'messages') {
    return (
      <PanelShell title="Messages" icon={Mail}>
        <EmptyState
          icon={Mail}
          title="No conversations yet"
          description="Direct messaging is planned for a later part of the build. For now, share a post link instead."
        />
      </PanelShell>
    );
  }

  if (navKey === 'bookmarks') {
    return (
      <PanelShell title="Bookmarks" icon={Bookmark}>
        <BookmarksPanel />
      </PanelShell>
    );
  }

  if (navKey === 'settings') {
    return (
      <PanelShell title="Settings" icon={SettingsIcon} description="Prototype preferences — not persisted.">
        {/* Language preferences */}
        <LanguagePreferencesSection />

        <div className="divide-y divide-border">
          {[
            { label: 'Account', hint: 'Profile, username, email' },
            { label: 'Privacy and safety', hint: 'Audience, blocked accounts' },
            { label: 'Notifications', hint: 'Email and push preferences' },
            { label: 'Display', hint: 'Theme, text size' },
            { label: 'Accessibility', hint: 'Reduced motion, contrast' },
            { label: 'About Desily', hint: 'Version, terms, contact' },
          ].map(({ label, hint }) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                toast({
                  title: label,
                  description: 'This screen is not part of this prototype milestone.',
                })
              }
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span>
                <span className="block text-sm font-medium text-foreground">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
              <span className="text-muted-foreground" aria-hidden>›</span>
            </button>
          ))}
        </div>
      </PanelShell>
    );
  }

  return null;
}

// ── Language preferences section (shown in Settings) ─────────────────────

const ALL_LANGUAGES: Language[] = ['en', 'hi', 'te', 'ta', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa', 'or', 'ur'];

function LanguagePreferencesSection() {
  const interfaceLanguage = useSocialStore((s) => s.interfaceLanguage);
  const setInterfaceLanguage = useSocialStore((s) => s.setInterfaceLanguage);
  const preferredContentLanguages = useSocialStore((s) => s.preferredContentLanguages);
  const togglePreferredContentLanguage = useSocialStore((s) => s.togglePreferredContentLanguage);

  return (
    <div className="border-b border-border p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Languages className="h-4 w-4 text-brand" />
        Language preferences
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Choose the language for the interface and the languages you want to see content in.
      </p>

      {/* Interface language */}
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-foreground">Interface language</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setInterfaceLanguage(lang)}
              aria-pressed={interfaceLanguage === lang}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                interfaceLanguage === lang
                  ? 'bg-brand text-brand-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent',
              )}
            >
              {languageLabel(lang)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Note: In this prototype, the interface language preference is stored but only a subset of UI labels are translated. The architecture is ready for a full i18n integration.
        </p>
      </div>

      {/* Content languages */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">Preferred content languages</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_LANGUAGES.map((lang) => {
            const active = preferredContentLanguages.has(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => togglePreferredContentLanguage(lang)}
                aria-pressed={active}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-brand text-brand-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent',
                )}
              >
                {languageLabel(lang)}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Tap to toggle. At least one language must remain selected.
        </p>
      </div>
    </div>
  );
}
