'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { LogoMark } from '@/components/social/Logo';
import type { OwnProfile } from '@/lib/types';
import { OnboardingView } from './OnboardingView';

/**
 * Onboarding gate (feature: complete profile system).
 *
 * Wraps the app shell. For every authenticated session it checks (once per
 * mount) whether the user still needs onboarding:
 *
 *   GET /api/profile → { user: { onboardingRequired } }
 *
 *   - onboardingRequired === false → render the app as usual.
 *   - onboardingRequired === true  → render the "Complete your profile"
 *     screen INSTEAD of the app until the required fields are saved.
 *   - Anonymous visitors / suspended accounts (401) → app as usual
 *     (suspended users are treated as signed out everywhere else too).
 *
 * Returning users never see this screen again: completion is persisted via
 * User.onboardedAt in the database, and the backfill migration marks all
 * pre-existing accounts as onboarded.
 */

type CheckState = 'idle' | 'checking' | 'required' | 'ok';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [check, setCheck] = useState<CheckState>('idle');
  const [profile, setProfile] = useState<OwnProfile | null>(null);

  const verify = useCallback(async () => {
    setCheck('checking');
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        // 401 (not signed in / suspended) or transient failure — fall back
        // to the normal app rather than blocking anyone.
        setCheck('idle');
        return;
      }
      const data = (await res.json()) as { user?: OwnProfile };
      if (!data.user) {
        setCheck('idle');
        return;
      }
      setProfile(data.user);
      setCheck(data.user.onboardingRequired ? 'required' : 'ok');
    } catch {
      setCheck('idle');
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void (async () => {
      await verify();
    })();
  }, [status, verify]);

  // Unauthenticated (visitor or suspended) → behave exactly like before the
  // gate existed. Derived, so no effect is needed to reset the state.
  const effectiveCheck = status === 'unauthenticated' ? 'idle' : check;

  // ── Onboarding required → replace the app with the setup screen ──
  if (status === 'authenticated' && effectiveCheck === 'required' && profile) {
    return <OnboardingView profile={profile} onComplete={() => void verify()} />;
  }

  // ── Resolving → minimal branded splash (prevents app-flash-then-yank) ──
  if (status === 'authenticated' && (effectiveCheck === 'checking' || (effectiveCheck === 'idle' && !profile))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <LogoMark className="h-10 w-10" />
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading your profile…</span>
      </div>
    );
  }

  return <>{children}</>;
}
