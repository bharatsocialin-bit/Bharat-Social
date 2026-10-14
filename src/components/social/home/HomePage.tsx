'use client';

import { useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  Sparkles,
  Film,
  Brain,
  Compass,
  ChevronRight,
  MapPin,
  Users,
  Languages,
  ArrowRight,
  Image as ImageIcon,
  Smile,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { DEMO_USER_MAP, CURRENT_USER_ID } from '@/data/users';
import { PULSE_CITIES, PULSE_CITY_MAP, DEFAULT_PULSE_CITY_ID } from '@/data/pulse-cities';
import { PULSE_REPORTS_BY_CITY } from '@/data/pulse-reports';
import { PULSE_TOPICS } from '@/data/pulse-topics';
import { DEMO_TRENDING, DEMO_SUGGESTED } from '@/data/explore';
import { formatCount, languageLabel } from '@/lib/format';
import { UserAvatar } from '@/components/social/UserAvatar';
import { PostCard } from '@/components/social/PostCard';
import { LogoFull } from '@/components/social/Logo';
import { useAvatarUser } from '@/hooks/use-avatar-user';
import { ReportStatusBadge } from '@/components/social/pulse/ReportStatusBadge';
import { useToast } from '@/hooks/use-toast';
import type { Language, NavKey } from '@/lib/types';

const ALL_LANGUAGES: Language[] = ['en', 'hi', 'te', 'ta', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa', 'or', 'ur'];

export function HomePage() {
  const posts = useSocialStore((s) => s.posts);
  const shorts = useSocialStore((s) => s.shorts);
  const setActiveNav = useSocialStore((s) => s.setActiveNav);
  const setPulseCityId = useSocialStore((s) => s.setPulseCityId);
  const openProfile = useSocialStore((s) => s.openProfile);
  const followingIds = useSocialStore((s) => s.followingIds);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const pulseCityId = useSocialStore((s) => s.pulseCityId);
  const preferredContentLanguages = useSocialStore((s) => s.preferredContentLanguages);
  const togglePreferredContentLanguage = useSocialStore((s) => s.togglePreferredContentLanguage);
  const avatarUser = useAvatarUser();
  const { toast } = useToast();

  const recentPosts = useMemo(() => posts.slice(0, 4), [posts]);
  const popularShorts = useMemo(() => shorts.slice(0, 4), [shorts]);
  const topTopics = useMemo(() => PULSE_TOPICS.slice(0, 2), []);

  const cityReports = PULSE_REPORTS_BY_CITY[pulseCityId] ?? [];
  const cityHighlights = cityReports.slice(0, 2);
  const currentCity = PULSE_CITY_MAP[pulseCityId] ?? PULSE_CITY_MAP[DEFAULT_PULSE_CITY_ID];

  const suggestedCreators = DEMO_SUGGESTED.slice(0, 4)
    .map((s) => DEMO_USER_MAP[s.userId])
    .filter(Boolean);

  function handleQuickPost() {
    setActiveNav('feed');
    toast({
      title: 'Compose your post',
      description: 'Opening the full feed composer…',
    });
  }

  return (
    <div className="min-h-full">
      {/* ── A. Hero / Welcome Banner — Dark Modern Gradient ──────────────── */}
      <HeroBanner setActiveNav={setActiveNav} />

      {/* ── B. Feature Shortcuts — 4 colorful chips ───────────────────────── */}
      <section className="border-b border-border bg-card p-4">
        <div className="grid grid-cols-4 gap-2">
          <FeatureChip
            icon={Activity}
            label="India Pulse"
            sublabel="Local talks"
            iconBg="bg-india-green"
            onClick={() => setActiveNav('pulse')}
          />
          <FeatureChip
            icon={Film}
            label="Shorts"
            sublabel="Watch & create"
            iconBg="bg-saffron"
            onClick={() => setActiveNav('shorts')}
          />
          <FeatureChip
            icon={Brain}
            label="India Quiz"
            sublabel="Play & learn"
            iconBg="bg-navy"
            onClick={() => setActiveNav('quiz')}
          />
          <FeatureChip
            icon={Compass}
            label="Explore"
            sublabel="Discover"
            iconBg="bg-saffron"
            onClick={() => setActiveNav('explore')}
          />
        </div>
      </section>

      {/* ── C. Post Composer ──────────────────────────────────────────────── */}
      <section className="border-b border-border bg-card p-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => openProfile(CURRENT_USER_ID)}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            aria-label="Open your profile"
          >
            <UserAvatar user={avatarUser} size="md" />
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={handleQuickPost}
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              What’s on your mind today?
            </button>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Language toggles */}
                {['en', 'hi', 'ta'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => togglePreferredContentLanguage(lang as Language)}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
                      preferredContentLanguages.has(lang as Language)
                        ? 'bg-navy text-white'
                        : 'bg-secondary text-white/60 hover:bg-saffron-soft',
                    )}
                  >
                    {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'தமிழ்'}
                  </button>
                ))}
                {/* Attachment icons */}
                <button type="button" className="ml-1 rounded-full p-1.5 text-white/60 transition-colors hover:bg-saffron-soft hover:text-saffron" aria-label="Add image">
                  <ImageIcon className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-saffron-soft hover:text-saffron" aria-label="Add poll">
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-saffron-soft hover:text-saffron" aria-label="Add emoji">
                  <Smile className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleQuickPost}
                className="rounded-full bg-saffron px-5 py-1.5 text-sm font-semibold text-white shadow-soft transition-all hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── D. Social Feed — For You / Following tabs ────────────────────── */}
      <section className="border-b border-border">
        <div className="flex border-b border-border bg-card">
          <button
            type="button"
            onClick={() => setActiveNav('feed')}
            className="flex-1 border-b-2 border-saffron px-4 py-3 text-sm font-semibold text-white"
          >
            For You
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('feed')}
            className="flex-1 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-white/50 transition-colors hover:text-white"
          >
            Following
          </button>
        </div>
        <div>
          {recentPosts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={() => setActiveNav('feed')}
            className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-saffron bg-saffron-soft/50 py-2.5 text-sm font-semibold text-saffron transition-all hover:bg-saffron hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          >
            Open the full social feed
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── E. India Pulse highlights ────────────────────────────────────── */}
      <section className="border-b border-border p-4">
        <SectionHeader
          icon={Activity}
          iconColor="text-india-green"
          title="India Pulse"
          subtitle={`Local conversations from ${currentCity.name}`}
          onSeeAll={() => setActiveNav('pulse')}
        />
        {/* City selector chips */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PULSE_CITIES.slice(0, 8).map((city) => {
            const active = city.id === pulseCityId;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => setPulseCityId(city.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-india-green text-white'
                    : 'bg-secondary text-white/70 hover:bg-india-green-soft hover:text-india-green',
                )}
              >
                <MapPin className="h-3 w-3" />
                {city.name}
              </button>
            );
          })}
        </div>
        {cityHighlights.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {cityHighlights.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setActiveNav('pulse')}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-md hover:border-india-green/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-india-green-soft px-2 py-0.5 text-[10px] font-medium text-india-green">
                    {report.category}
                  </span>
                  <ReportStatusBadge status={report.status} variant="compact" />
                </div>
                <p className="text-sm font-semibold leading-snug text-white line-clamp-2">
                  {report.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">{report.summary}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No reports for {currentCity.name} yet. Try another city.
          </div>
        )}
      </section>

      {/* ── Popular Shorts ───────────────────────────────────────────────── */}
      <section className="border-b border-border p-4">
        <SectionHeader
          icon={Film}
          iconColor="text-saffron"
          title="Popular Shorts"
          subtitle="Vertical videos from across India"
          onSeeAll={() => setActiveNav('shorts')}
        />
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {popularShorts.map((video) => {
            const author = DEMO_USER_MAP[video.authorId];
            if (!author) return null;
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveNav('shorts')}
                className="relative flex h-48 w-28 shrink-0 flex-col overflow-hidden rounded-xl bg-black text-left shadow-soft transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron sm:h-56 sm:w-32"
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br', video.posterGradient)} />
                <div className="absolute inset-0 flex flex-col justify-end p-2">
                  <div className="flex items-center gap-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[8px] font-bold text-white ring-1 ring-white/30">
                      {author.initials}
                    </span>
                    <span className="truncate text-[10px] font-medium text-white">
                      @{author.handle}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-white/90">
                    {video.caption}
                  </p>
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] text-white/60">
                    <Film className="h-2.5 w-2.5" />
                    {formatCount(video.likes)} likes
                  </span>
                </div>
                {video.language !== 'en' && (
                  <span className="absolute left-1 top-1 rounded-full bg-white/20 px-1 py-0 text-[8px] font-medium text-white backdrop-blur-sm">
                    {languageLabel(video.language)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── India Quiz shortcut ───────────────────────────────────────────── */}
      <section className="border-b border-border p-4">
        <SectionHeader
          icon={Brain}
          iconColor="text-white"
          title="India Quiz"
          subtitle="Test your knowledge across 9 categories"
          onSeeAll={() => setActiveNav('quiz')}
        />
        <button
          type="button"
          onClick={() => setActiveNav('quiz')}
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-navy/20 bg-gradient-to-br from-navy-soft/40 to-saffron-soft/30 p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-md hover:border-navy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-white shadow-soft">
            <Brain className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              Play today’s quiz
            </p>
            <p className="text-xs text-muted-foreground">
              9 categories · daily challenge · badges · leaderboards
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </button>
      </section>

      {/* ── One Story, Many Perspectives ─────────────────────────────────── */}
      <section className="border-b border-border p-4">
        <SectionHeader
          icon={Sparkles}
          iconColor="text-saffron"
          title="One Story, Many Perspectives"
          subtitle="Topics across regions and languages"
          onSeeAll={() => {
            setActiveNav('pulse');
            useSocialStore.getState().setPulseTab('community');
          }}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {topTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                setActiveNav('pulse');
                useSocialStore.getState().setPulseTab('community');
                useSocialStore.getState().openTopic(topic.id);
              }}
              className="rounded-xl border border-border bg-card p-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-md hover:border-saffron/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-saffron-soft px-1.5 py-0.5 text-[10px] font-medium text-saffron">
                <Sparkles className="h-2.5 w-2.5" />
                Manually curated
              </span>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-white line-clamp-2">
                {topic.title}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {topic.regions.slice(0, 3).map((r) => (
                  <span key={r} className="rounded-full bg-muted px-1.5 py-0 text-[9px] text-muted-foreground">
                    {r}
                  </span>
                ))}
                <span className="rounded-full bg-muted px-1.5 py-0 text-[9px] text-muted-foreground">
                  {topic.languages.length} languages
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Trending discussions ─────────────────────────────────────────── */}
      <section className="border-b border-border p-4">
        <SectionHeader
          icon={TrendingUp}
          iconColor="text-saffron"
          title="Trending in India"
          onSeeAll={() => setActiveNav('explore')}
        />
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {DEMO_TRENDING.slice(0, 5).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                useSocialStore.getState().setSearchQuery(t.title.replace('#', ''));
                setActiveNav('feed');
              }}
              className="flex shrink-0 flex-col gap-0.5 rounded-xl border border-border bg-card px-3 py-2 text-left shadow-soft transition-colors hover:border-saffron/40 hover:bg-saffron-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <span className="text-[10px] text-muted-foreground">{t.category.split('·')[0]}</span>
              <span className="text-sm font-semibold text-white">{t.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatCount(t.postsCount)} posts
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Recommended creators ─────────────────────────────────────────── */}
      <section className="border-b border-border p-4">
        <SectionHeader
          icon={Users}
          iconColor="text-india-green"
          title="Creators to follow"
          onSeeAll={() => setActiveNav('explore')}
        />
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {suggestedCreators.map((user) => {
            const isFollowing = followingIds.has(user.id);
            return (
              <div
                key={user.id}
                className="flex w-36 shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => openProfile(user.id)}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded-full"
                  aria-label={`Open ${user.name}’s profile`}
                >
                  <UserAvatar user={user} size="lg" />
                </button>
                <button
                  type="button"
                  onClick={() => openProfile(user.id)}
                  className="text-sm font-semibold text-white hover:underline"
                >
                  {user.name}
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {formatCount(user.followers)} followers
                </span>
                <button
                  type="button"
                  onClick={() => {
                    toggleFollow(user.id);
                    toast({
                      title: isFollowing ? `Unfollowed ${user.name}` : `Following ${user.name}`,
                      description: 'Demonstration only.',
                    });
                  }}
                  className={cn(
                    'mt-0.5 w-full rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-[0.97]',
                    isFollowing
                      ? 'border border-border text-white hover:border-destructive/40 hover:text-destructive'
                      : 'bg-saffron text-white hover:brightness-105',
                  )}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Content language preferences ─────────────────────────────────── */}
      <section className="border-b border-border p-4">
        <SectionHeader
          icon={Languages}
          iconColor="text-white"
          title="Your languages"
          subtitle="Tap to filter your feed"
        />
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
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-navy text-white'
                    : 'bg-secondary text-white/70 hover:bg-saffron-soft hover:text-saffron',
                )}
              >
                {languageLabel(lang)}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Footer with tricolor accent ─────────────────────────────────── */}
      <div className="p-4">
        <div className="mb-3 h-1 overflow-hidden rounded-full">
          <div className="h-full bg-tricolor-horizontal opacity-50" />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          BharatSocial — A social space for everyone across India. Demonstration prototype.
        </p>
      </div>
    </div>
  );
}

/** Feature shortcut chip — colored icon + label + sublabel. */
function FeatureChip({
  icon: Icon,
  label,
  sublabel,
  iconBg,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  iconBg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-all hover:border-saffron/40 hover:bg-saffron-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg', iconBg)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-semibold text-white">{label}</span>
      <span className="text-[10px] text-muted-foreground">{sublabel}</span>
    </button>
  );
}

function SectionHeader({
  icon: Icon,
  iconColor = 'text-saffron',
  title,
  subtitle,
  onSeeAll,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className={cn('h-5 w-5', iconColor)} />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold leading-tight text-white">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-saffron hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
        >
          See all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Banner — Dark Modern Gradient (Option 4)
// ─────────────────────────────────────────────────────────────────────────────

const HERO_BENEFITS = [
  { label: 'Connect across India', icon: Users },
  { label: 'Discuss what matters', icon: Activity },
  { label: 'Discover opportunities', icon: Compass },
  { label: 'Grow together', icon: Sparkles },
];

function HeroBanner({ setActiveNav }: { setActiveNav: (nav: NavKey) => void }) {
  return (
    <section
      className="relative overflow-hidden"
      aria-label="BharatSocial hero"
    >
      {/* ── Full-bleed sunset + glowing India map background ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/india-sunset-hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden
      />
      {/* ── Left-to-right dark gradient overlay for text readability ──
          Left side is dark (for headline), center is lighter (map visible),
          right side is medium-dark (for benefits panel legibility) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(6,20,38,0.92) 0%, rgba(6,20,38,0.7) 30%, rgba(6,20,38,0.35) 50%, rgba(6,20,38,0.55) 75%, rgba(6,20,38,0.75) 100%)',
        }}
        aria-hidden
      />
      {/* Top fade for extra contrast at the top */}
      <div
        className="absolute inset-x-0 top-0 h-24"
        style={{ background: 'linear-gradient(to bottom, rgba(6,20,38,0.6), transparent)' }}
        aria-hidden
      />

      {/* ── Content: 2-column grid — LEFT (headline+buttons) | RIGHT (benefits) ──
          The map shows through the center gap between the two columns. */}
      <div
        className="relative grid grid-cols-1 gap-6 px-6 py-8 lg:h-[400px] lg:grid-cols-[1fr_280px] lg:items-center lg:gap-8 lg:px-8 lg:py-0"
      >
        {/* ── LEFT: logo + headline + supporting text + buttons ── */}
        <div className="min-w-0 py-4 lg:py-0">
          {/* Logo */}
          <div className="mb-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            <LogoFull heightPx={48} />
          </div>

          {/* Headline — wraps to 2-3 lines */}
          <h1 className="text-2xl font-bold leading-[1.15] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-3xl lg:text-[2.25rem] lg:leading-[1.1]">
            Our India. Our Future.<br />
            <span className="bg-gradient-to-r from-saffron via-amber-400 to-saffron bg-clip-text text-transparent">
              Our Voice.
            </span>
          </h1>

          {/* Supporting text */}
          <p className="mt-3 max-w-md text-sm leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)] sm:text-base" style={{ color: '#D1D5DB' }}>
            People. Perspectives. Possibilities. A social platform for a
            stronger, more connected India.
          </p>

          {/* Buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveNav('feed')}
              className="inline-flex items-center gap-2 rounded-full bg-saffron px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-saffron/30 transition-all hover:brightness-110 hover:shadow-saffron/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#061426]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('pulse')}
              className="inline-flex items-center gap-2 rounded-full border border-india-green/50 bg-white/5 px-6 py-3 text-sm font-semibold text-india-green backdrop-blur-sm transition-all hover:bg-india-green/10 hover:border-india-green active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-india-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061426]"
            >
              <Activity className="h-4 w-4" />
              Explore India Pulse
            </button>
          </div>
        </div>

        {/* ── RIGHT: translucent benefits panel ── */}
        <div className="min-w-0 py-4 lg:py-0">
          <div
            className="rounded-2xl border border-white/15 p-5 backdrop-blur-md"
            style={{ background: 'rgba(15, 23, 42, 0.75)' }}
          >
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">
              Why BharatSocial
            </h2>
            <ul className="space-y-3.5">
              {HERO_BENEFITS.map(({ label, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron/15 ring-1 ring-saffron/30">
                    <Icon className="h-4 w-4 text-saffron" />
                  </span>
                  <span className="text-sm font-medium text-white">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// IndiaNetworkMap is no longer used — the hero now uses the
// "Glowing Connected India at Sunset" image as a full-bleed background.
function IndiaNetworkMap() {
  return null;
}
