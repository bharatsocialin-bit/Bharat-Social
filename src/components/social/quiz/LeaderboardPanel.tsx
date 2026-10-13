'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCount } from '@/lib/format';
import { UserAvatar } from '@/components/social/UserAvatar';
import { EmptyState } from '@/components/social/EmptyState';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  username: string;
  initials: string;
  avatarGradient: string;
  totalPoints: number;
  quizzesPlayed: number;
  bestAccuracy: number;
}

const PERIOD_TABS: { key: string; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'all-time', label: 'All Time' },
];

export function LeaderboardPanel() {
  const [period, setPeriod] = useState('all-time');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<{ rank: number; totalPoints: number; quizzesPlayed: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Defer the setLoading call so we don't call setState synchronously
    // inside the effect body (eslint rule).
    const raf = requestAnimationFrame(() => setLoading(true));
    fetch(`/api/quiz/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setEntries(d.leaderboard || []);
        setCurrentUserRank(d.currentUserRank || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
        cancelAnimationFrame(raf);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-saffron" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Period selector */}
      <div className="mb-3 flex gap-1.5">
        {PERIOD_TABS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              period === p.key
                ? 'bg-saffron text-white'
                : 'bg-card border border-border text-white/60 hover:bg-saffron-soft/30',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No leaderboard entries yet"
          description="Play your first quiz to claim the top spot!"
        />
      ) : (
        <>
          {/* Podium — top 3 */}
          {entries.length >= 3 && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <PodiumCard entry={entries[1]} rank={2} />
              <PodiumCard entry={entries[0]} rank={1} />
              <PodiumCard entry={entries[2]} rank={3} />
            </div>
          )}

          {/* Full list */}
          <ol className="space-y-1.5">
            {entries.slice(3).map((entry, idx) => (
              <li
                key={entry.userId}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    'bg-secondary text-secondary-foreground',
                  )}
                >
                  {idx + 4}
                </span>
                <UserAvatar
                  user={{
                    name: entry.name,
                    initials: entry.initials,
                    avatarGradient: entry.avatarGradient,
                  }}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {entry.name}
                    <span className="ml-1 text-xs text-muted-foreground">@{entry.username}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCount(entry.totalPoints)} pts · {entry.quizzesPlayed} quizzes · {Math.round(entry.bestAccuracy * 100)}% best
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Current user's rank (shown even if outside top 50) */}
          {currentUserRank && currentUserRank.rank > entries.length && (
            <div className="mt-3 rounded-xl border border-saffron/30 bg-saffron-soft/20 p-3">
              <p className="text-sm font-medium text-foreground">
                Your rank: #{currentUserRank.rank}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCount(currentUserRank.totalPoints)} points · {currentUserRank.quizzesPlayed} quizzes played
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PodiumCard({ entry, rank }: { entry: LeaderboardEntry; rank: 1 | 2 | 3 }) {
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const gradients = {
    1: 'from-amber-400 to-yellow-500',
    2: 'from-slate-300 to-slate-400',
    3: 'from-orange-300 to-orange-400',
  };
  const icons = { 1: Crown, 2: Medal, 3: Medal };
  const Icon = icons[rank];

  return (
    <div className="flex flex-col items-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center">
        <UserAvatar
          user={{
            name: entry.name,
            initials: entry.initials,
            avatarGradient: entry.avatarGradient,
          }}
          size="md"
          className="ring-2 ring-white"
        />
      </div>
      <p className="mb-1 max-w-full truncate text-xs font-semibold text-foreground">
        {entry.name}
      </p>
      <p className="mb-1 text-[10px] text-muted-foreground">
        {formatCount(entry.totalPoints)} pts
      </p>
      <div
        className={cn(
          'flex w-full items-start justify-center rounded-t-lg bg-gradient-to-b pt-1',
          gradients[rank],
          heights[rank],
        )}
      >
        <Icon className="h-5 w-5 text-white drop-shadow" />
      </div>
    </div>
  );
}
