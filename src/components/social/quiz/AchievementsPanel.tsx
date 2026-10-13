'use client';

import { useState, useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import * as LucideIcons from 'lucide-react';
import type { Language } from '@/lib/types';

interface Achievement {
  slug: string;
  name: string;
  description: string;
  nameTranslations: Record<string, string>;
  descriptionTranslations: Record<string, string>;
  icon: string;
  gradient: string;
  criteriaType: string;
  criteriaValue: number | null;
  earned: boolean;
}

export function AchievementsPanel() {
  const streak = useSocialStore((s) => s.quizStreakDays);
  const quizLanguage = useSocialStore((s) => s.quizLanguage);
  const earnedAchievementIds = useSocialStore((s) => s.earnedAchievementIds);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/quiz/achievements')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAchievements(d.achievements || []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-saffron" />
      </div>
    );
  }

  // Get earned count from the API response (server-authoritative).
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="p-4">
      {/* Streak summary */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-gradient-to-r from-rose-50 to-orange-50 p-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-2xl">
          🔥
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {streak} day{streak === 1 ? '' : 's'} streak
          </p>
          <p className="text-xs text-muted-foreground">
            Play every day to keep your streak alive!
          </p>
        </div>
      </div>

      <div className="mb-3 text-sm font-medium text-muted-foreground">
        {earnedCount} of {achievements.length} unlocked
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {achievements.map((ach) => {
          // Use the server's `earned` flag (authoritative), but also
          // union with the local store's set (which may be ahead due to
          // optimistic refresh).
          const earned = ach.earned || earnedAchievementIds.has(ach.slug);
          const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[ach.icon] ?? Lock;

          return (
            <div
              key={ach.slug}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 transition-all',
                earned
                  ? 'border-transparent bg-gradient-to-br text-white shadow-sm ' + ach.gradient
                  : 'border-border bg-card opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  earned ? 'bg-white/20 backdrop-blur-sm' : 'bg-muted',
                )}
              >
                {earned ? (
                  <Icon className="h-5 w-5" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-semibold', earned ? 'text-white' : 'text-foreground')}>
                  {localizeField(ach.nameTranslations, ach.name, quizLanguage)}
                </p>
                <p className={cn('text-xs', earned ? 'text-white/80' : 'text-muted-foreground')}>
                  {localizeField(ach.descriptionTranslations, ach.description, quizLanguage)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function localizeField(translations: Record<string, string>, fallback: string, lang: Language): string {
  if (lang !== 'en' && translations && translations[lang]) {
    return translations[lang];
  }
  return fallback;
}
