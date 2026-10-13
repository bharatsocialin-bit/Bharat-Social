'use client';

import {
  Home,
  Compass,
  Activity,
  Rss,
  Film,
  Brain,
  Bell,
  Mail,
  Bookmark,
  User,
  Settings,
  Feather,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import type { NavKey } from '@/lib/types';
import { useSocialStore } from '@/store/useSocialStore';
import { CURRENT_USER_ID, DEMO_USER_MAP } from '@/data/users';
import { LogoMark, LogoFull } from './Logo';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '@/hooks/use-auth';
import { AuthDialog } from '@/components/auth/AuthDialog';

interface NavItemDef {
  key: NavKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemDef[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'pulse', label: 'India Pulse', icon: Activity },
  { key: 'feed', label: 'Feed', icon: Rss },
  { key: 'shorts', label: 'Shorts', icon: Film },
  { key: 'quiz', label: 'India Quiz', icon: Brain },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'messages', label: 'Messages', icon: Mail },
  { key: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface LeftSidebarProps {
  /** Called when the user clicks the prominent Post button. */
  onCompose: () => void;
}

export function LeftSidebar({ onCompose }: LeftSidebarProps) {
  const activeNav = useSocialStore((s) => s.activeNav);
  const setActiveNav = useSocialStore((s) => s.setActiveNav);
  const openProfile = useSocialStore((s) => s.openProfile);
  const demoUser = DEMO_USER_MAP[CURRENT_USER_ID];
  const { isAuthenticated, user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!cancelled) {
          setIsAdmin(d?.user?.role === 'admin');
        }
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Build nav items — add Admin only if user is admin
  const navItems = isAdmin
    ? [...NAV_ITEMS, { key: 'admin' as NavKey, label: 'Admin', icon: ShieldCheck }]
    : NAV_ITEMS;

  // Use the demo user for avatar display if not authenticated
  const currentUser = isAuthenticated && user
    ? { ...demoUser, name: user.name || 'User', handle: (user.email?.split('@')[0] || 'user') }
    : demoUser;

  function handleComposeClick() {
    if (!isAuthenticated) {
      setAuthMode('login');
      setAuthOpen(true);
    } else {
      onCompose();
    }
  }

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden h-screen flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex md:w-[88px] lg:w-[272px] lg:px-4"
    >
      {/* Brand — full logo image on desktop, SVG mark on collapsed tablet view */}
      <div className="mb-6 flex items-center gap-2 px-1">
        {/* Collapsed tablet view (md only) — SVG chakra mark */}
        <LogoMark className="h-9 w-9 lg:hidden" />
        {/* Desktop view (lg+) — full horizontal logo image */}
        <LogoFull heightPx={44} className="hidden lg:block" />
      </div>

      {/* Nav items — white text, saffron active accents */}
      <nav className="flex flex-1 flex-col gap-1">
        <ul className="space-y-0.5">
          {navItems.map(({ key, label, icon: Icon }) => {
            const active = activeNav === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    if (key === 'profile') openProfile(CURRENT_USER_ID);
                    else setActiveNav(key);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex w-full items-center gap-4 rounded-full px-3 py-2.5 text-[15px] font-medium transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                    active
                      ? 'bg-saffron-soft text-saffron font-semibold'
                      : 'text-white/80 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="relative flex h-6 w-6 items-center justify-center">
                    <Icon
                      className={cn(
                        'h-6 w-6 transition-transform group-hover:scale-105',
                        active ? 'text-saffron' : 'text-white/70',
                      )}
                    />
                  </span>
                  <span className="hidden lg:inline">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Post button — saffron primary */}
        <button
          type="button"
          onClick={handleComposeClick}
          className={cn(
            'mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-saffron px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-saffron/20 transition-all',
            'hover:brightness-110 hover:shadow-saffron/30',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'active:scale-[0.98]',
            'lg:px-6',
          )}
          aria-label={isAuthenticated ? 'Create a new post' : 'Log in to post'}
        >
          <Feather className="h-5 w-5 lg:hidden" />
          <span className="hidden lg:inline">{isAuthenticated ? 'Post' : 'Log In'}</span>
        </button>
      </nav>

      {/* Current user chip OR login button */}
      {isAuthenticated ? (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => openProfile(CURRENT_USER_ID)}
            className="flex w-full items-center gap-3 rounded-full p-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            aria-label="Open your profile"
          >
            <UserAvatar user={currentUser} size="md" />
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
              <p className="truncate text-sm text-muted-foreground">@{currentUser.handle}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="hidden w-full rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-saffron lg:block"
          >
            Log out
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-saffron/40 hover:bg-saffron-soft/30 lg:hidden"
          >
            <LogIn className="h-4 w-4" />
            Log In
          </button>
          <div className="hidden text-center lg:block">
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
              className="text-xs text-muted-foreground hover:text-saffron"
            >
              Create account
            </button>
          </div>
        </div>
      )}

      {/* Auth dialog */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} />
    </aside>
  );
}
