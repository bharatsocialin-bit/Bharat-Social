'use client';

import { Construction, ArrowLeft } from 'lucide-react';
import { useSocialStore } from '@/store/useSocialStore';
import type { NavKey } from '@/lib/types';

interface ComingSoonProps {
  /** The feature name to display. */
  feature: string;
  /** Optional description of what's coming. */
  description?: string;
  /** Nav key to return to (defaults to 'home'). */
  backTo?: NavKey;
  backLabel?: string;
}

/**
 * Placeholder view for nav items whose features are not yet built.
 * Shows a friendly "Coming Soon" message with a back button.
 *
 * Used by: Bible, Comic Bible, Groups, Churches, Marketplace (Phase 2 features).
 */
export function ComingSoon({
  feature,
  description,
  backTo = 'home',
  backLabel = 'Back to Home',
}: ComingSoonProps) {
  const setActiveNav = useSocialStore((s) => s.setActiveNav);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-saffron-soft">
        <Construction className="h-10 w-10 text-saffron" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{feature} — Coming Soon</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {description ||
            `We're working hard to bring you ${feature}. This feature is under active development and will be available soon.`}
        </p>
      </div>
      <button
        onClick={() => setActiveNav(backTo)}
        className="inline-flex items-center gap-2 rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>
    </div>
  );
}
