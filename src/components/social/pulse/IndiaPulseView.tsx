'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, MapPin, Layers, Info, TrendingUp, Loader2, ShieldCheck,
  Users, FileText, ChevronRight, Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { PULSE_CITIES } from '@/data/pulse-cities';
import { PostCard } from '@/components/social/PostCard';
import { EmptyState } from '@/components/social/EmptyState';
import { ReportStatusBadge } from './ReportStatusBadge';
import { UserStoriesBar } from './user-stories/UserStoriesBar';
import { StoryCreator } from './user-stories/StoryCreator';
import { StoryViewer } from './user-stories/StoryViewer';
import { StoryArchive } from './user-stories/StoryArchive';
import type { PulseTab, DemoPost } from '@/lib/types';
import { formatCount } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';

const TABS: { key: PulseTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'city', label: 'Trending', icon: TrendingUp },
  { key: 'user-stories', label: 'Stories', icon: Layers },
  { key: 'community', label: 'Community', icon: Newspaper },
  { key: 'about', label: 'About', icon: Info },
];

interface TrendingItem {
  topic: string;
  score: number;
  postCount: number;
  topPostId: string;
}

interface StoryItem {
  id: string;
  title: string;
  summary: string;
  region: string | null;
  status: string;
  evidenceSource: string | null;
  evidenceNote: string | null;
  postIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface RegionalPost extends DemoPost {
  author: {
    id: string;
    name: string;
    handle: string;
    initials: string;
    avatarGradient: string;
    state: string | null;
    city: string | null;
  };
}

export function IndiaPulseView() {
  const pulseTab = useSocialStore((s) => s.pulseTab);
  const setPulseTab = useSocialStore((s) => s.setPulseTab);

  return (
    <div className="flex min-h-full flex-col">
      <PulseHeader pulseTab={pulseTab} setPulseTab={setPulseTab} />
      <div className="flex-1">
        {pulseTab === 'city' && <TrendingTab />}
        {pulseTab === 'user-stories' && (
          <>
            <UserStoriesBar />
            <UserStoriesPanel />
          </>
        )}
        {pulseTab === 'community' && <StoriesTab />}
        {pulseTab === 'about' && <PulseAboutPanel />}
      </div>
      {/* Story modals — mounted once, visibility driven by store. */}
      <StoryViewer />
      <StoryCreator />
      <StoryArchive />
    </div>
  );
}

function PulseHeader({
  pulseTab, setPulseTab,
}: {
  pulseTab: PulseTab;
  setPulseTab: (t: PulseTab) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-gradient-to-r from-india-green-soft/40 via-background to-saffron-soft/20 backdrop-blur">
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-india-green text-white shadow-soft">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight text-white">India Pulse</h1>
            <p className="text-[11px] text-muted-foreground">
              Trending discussions, regional conversations, and community signal.
            </p>
          </div>
        </div>
      </div>
      <div role="tablist" aria-label="India Pulse sections" className="mt-2 flex">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = pulseTab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setPulseTab(key)}
              className="group relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-saffron-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-saffron"
            >
              <Icon className={cn('h-4 w-4', active ? 'text-saffron' : 'text-white/50')} />
              <span className={cn(active ? 'text-white font-semibold' : 'text-white/50')}>{label}</span>
              <span className={cn('absolute inset-x-0 -bottom-px h-[3px] bg-saffron transition-transform', active ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
            </button>
          );
        })}
      </div>
    </header>
  );
}

// ── Trending Tab ────────────────────────────────────────────────────────────

function TrendingTab() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionalPosts, setRegionalPosts] = useState<RegionalPost[]>([]);
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pulse/trending')
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.trending) setTrending(d.trending); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadRegional = useCallback(() => {
    setRegionalLoading(true);
    const params = new URLSearchParams();
    if (stateFilter) params.set('state', stateFilter);
    if (cityFilter) params.set('city', cityFilter);
    fetch(`/api/pulse/regional?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.posts) setRegionalPosts(d.posts); })
      .finally(() => setRegionalLoading(false));
  }, [stateFilter, cityFilter]);

  useEffect(() => {
    const timer = setTimeout(loadRegional, 300);
    return () => clearTimeout(timer);
  }, [loadRegional]);

  return (
    <div className="space-y-4 p-4">
      {/* Trending topics */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <TrendingUp className="h-4 w-4 text-saffron" />
          Trending in India
        </h2>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
        ) : trending.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No trending topics yet. Be the first to post!
          </p>
        ) : (
          <ul className="space-y-2">
            {trending.map((t, i) => (
              <li key={t.topic} className="flex items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-saffron-soft/20">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saffron/15 text-xs font-bold text-saffron">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">#{t.topic}</p>
                  <p className="text-xs text-muted-foreground">{t.postCount} post{t.postCount === 1 ? '' : 's'} · score: {t.score}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Ranking: posts from last 7 days, scored by likes(×3) + comments(×2) + reposts(×2) + recency.
          This is a community activity estimate, not verified news.
        </p>
      </section>

      {/* Regional filter */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <MapPin className="h-4 w-4 text-india-green" />
          Regional Posts
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            placeholder="State (e.g. Maharashtra)"
            className="w-32 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-white placeholder:text-muted-foreground focus:border-saffron focus:outline-none"
          />
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="City (e.g. Mumbai)"
            className="w-32 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-white placeholder:text-muted-foreground focus:border-saffron focus:outline-none"
          />
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Posts are shown based on the author's profile state/city. Posts by users without a location are not shown here.
        </p>

        {regionalLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
        ) : regionalPosts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No posts found for this region. Try a different state or city.
          </p>
        ) : (
          <div>
            {regionalPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── User Stories Tab body (below the rail) ──────────────────────────────────

function UserStoriesPanel() {
  const { isAuthenticated } = useAuth();
  const setStoryCreatorOpen = useSocialStore((s) => s.setStoryCreatorOpen);

  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Layers className="h-4 w-4 text-saffron" />
          How User Stories work
        </h2>
        <ul className="mt-3 space-y-2 text-xs text-white/70">
          <li className="flex gap-2">
            <span className="text-saffron">•</span>
            <span>Post a text, photo, video, or link story — it stays live for 24 hours.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-saffron">•</span>
            <span>Stories are public — anyone visiting India Pulse can view them.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-saffron">•</span>
            <span>After 24h your story moves to your private archive, viewable for 7 days.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-saffron">•</span>
            <span>You can delete your story at any time — it disappears immediately.</span>
          </li>
        </ul>
        {isAuthenticated ? (
          <button
            onClick={() => setStoryCreatorOpen(true)}
            className="mt-3 w-full rounded-xl bg-saffron px-4 py-2 text-sm font-semibold text-white hover:bg-saffron/90"
          >
            Post a story
          </button>
        ) : (
          <p className="mt-3 rounded-xl bg-saffron/10 px-3 py-2 text-xs text-saffron/80">
            Sign in to post your own story.
          </p>
        )}
      </section>
    </div>
  );
}

// ── Stories Tab (Community Updates — admin-curated) ─────────────────────────

function StoriesTab() {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pulse/stories')
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.stories) setStories(d.stories); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/10 px-3 py-2 text-xs text-amber-200/80">
        Stories are manually curated by administrators. Status describes the evidence available, not a guarantee that every detail is true.
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-saffron" /></div>
      ) : stories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No stories yet"
          description="Community stories will appear here when administrators curate them."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stories.map((s) => (
            <a
              key={s.id}
              href={`/api/pulse/stories/${s.id}`}
              onClick={(e) => { e.preventDefault(); }}
              className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-saffron/40"
            >
              <div className="mb-2 flex items-center gap-2">
                <ReportStatusBadge
                  status={
                    s.status === 'confirmed' ? 'confirmed-by-source' :
                    s.status === 'corroborated' ? 'corroborated' : 'unverified'
                  }
                  variant="compact"
                />
                {s.region && (
                  <span className="text-xs text-muted-foreground">{s.region}</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white line-clamp-2">{s.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.summary}</p>
              {s.evidenceSource && (
                <p className="mt-2 text-[11px] text-saffron/80">
                  Source: {s.evidenceSource.slice(0, 60)}
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                {s.postIds.length} related post{s.postIds.length === 1 ? '' : 's'}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── About Panel ──────────────────────────────────────────────────────────────

function PulseAboutPanel() {
  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Activity className="h-5 w-5 text-saffron" />
          What is India Pulse?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          India Pulse surfaces trending discussions and community stories from across the platform.
          It uses real post data — no invented trends.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <TrendingUp className="h-5 w-5 text-saffron" />
          How trending works
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          Trending topics are calculated from posts created in the last 7 days.
          Each topic is scored by: likes (×3) + comments (×2) + reposts (×2) + a recency bonus.
          Each post contributes at most 1 topic to prevent any single post from dominating.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This is a community activity estimate, not independently verified news.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <ShieldCheck className="h-5 w-5 text-saffron" />
          Community Signal
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          Stories carry one of three transparent statuses:
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2">
            <ReportStatusBadge status="unverified" variant="compact" />
            <span className="text-xs text-muted-foreground">Community report, no independent corroboration yet.</span>
          </div>
          <div className="flex items-start gap-2">
            <ReportStatusBadge status="corroborated" variant="compact" />
            <span className="text-xs text-muted-foreground">At least one independent account has surfaced the same report.</span>
          </div>
          <div className="flex items-start gap-2">
            <ReportStatusBadge status="confirmed-by-source" variant="compact" />
            <span className="text-xs text-muted-foreground">A named official source has confirmed the report.</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Likes, reposts, and popularity never establish that something is true.
          Status changes are performed by authorized moderators through server-side APIs.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-200/30 bg-amber-50/5 p-4">
        <p className="text-sm text-amber-200/80">
          <span className="font-semibold">Note:</span> India Pulse trending and regional posts
          use real platform data. Stories are manually curated by administrators.
          This is not an automated news verification system.
        </p>
      </section>
    </div>
  );
}
