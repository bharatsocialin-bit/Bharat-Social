'use client';

import { Home, Activity, Film, Compass, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavKey } from '@/lib/types';
import { useSocialStore } from '@/store/useSocialStore';
import { CURRENT_USER_ID } from '@/data/users';
import { useAvatarUser } from '@/hooks/use-avatar-user';
import { UserAvatar } from './UserAvatar';

interface MobileNavProps {
  onCompose: () => void;
}

const TABS: { key: NavKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'pulse', label: 'Pulse', icon: Activity },
  { key: 'shorts', label: 'Shorts', icon: Film },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'profile', label: 'Profile', icon: User },
];

export function MobileNav({ onCompose }: MobileNavProps) {
  const activeNav = useSocialStore((s) => s.activeNav);
  const setActiveNav = useSocialStore((s) => s.setActiveNav);
  const openProfile = useSocialStore((s) => s.openProfile);
  const currentUser = useAvatarUser();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-sidebar-border bg-sidebar/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur md:hidden"
    >
      {TABS.slice(0, 2).map(({ key, label, icon: Icon }) => {
        const active = activeNav === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActiveNav(key)}
            aria-current={active ? 'page' : undefined}
            className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-saffron-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          >
            <Icon className={cn('h-6 w-6', active ? 'text-saffron' : 'text-white/60')} />
            <span className={active ? 'text-saffron font-semibold' : 'text-white/60'}>{label}</span>
          </button>
        );
      })}

      {/* Center Post FAB — saffron */}
      <button
        type="button"
        onClick={onCompose}
        aria-label="Create a new post"
        className="flex h-12 w-12 -translate-y-1 items-center justify-center rounded-full bg-saffron text-white shadow-md shadow-saffron/30 transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {TABS.slice(2).map(({ key, label, icon: Icon }) => {
        const active = activeNav === key;
        if (key === 'profile') {
          return (
            <button
              key={key}
              type="button"
              onClick={() => openProfile(CURRENT_USER_ID)}
              aria-current={active ? 'page' : undefined}
              className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-saffron-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <UserAvatar
                user={currentUser}
                size="sm"
                className={cn('ring-1', active ? 'ring-saffron' : 'ring-border')}
              />
              <span className={active ? 'text-saffron font-semibold' : 'text-white/60'}>{label}</span>
            </button>
          );
        }
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActiveNav(key)}
            aria-current={active ? 'page' : undefined}
            className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-saffron-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          >
            <Icon className={cn('h-6 w-6', active ? 'text-saffron' : 'text-white/60')} />
            <span className={active ? 'text-saffron font-semibold' : 'text-white/60'}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
