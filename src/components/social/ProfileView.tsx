'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Calendar,
  Link as LinkIcon,
  MessageSquareText,
  Award,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { DEMO_USER_MAP, CURRENT_USER_ID } from '@/data/users';
import { formatCount } from '@/lib/format';
import { UserAvatar } from './UserAvatar';
import { PostCard } from './PostCard';
import { EmptyState } from './EmptyState';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { BadgesSection } from './badges/BadgesSection';
import type { DemoPost, ProfileLink } from '@/lib/types';

/**
 * Profile page (feature: complete profile system).
 *
 * Three cases:
 *   1. Demo suggestions (users from the prototype map) — rendered from demo
 *      data exactly as before.
 *   2. Own profile ("u-current" / the session user id) — fetched live from
 *      /api/profile?id=… and shows the persistent photo, bio, state, links,
 *      plus an "Edit profile" button that opens the full editor.
 *   3. Any other real DB user — same live fetch without the edit button.
 *
 * Public profile fields come from the shared server builder
 * (src/lib/profile-server.ts); private fields (email, DOB, gender) are
 * never part of this payload.
 */

interface PublicProfileUser {
  id: string;
  username: string;
  name: string;
  bio: string | '';
  avatarGradient: string;
  initials: string;
  avatarUrl: string | null;
  state: string | null;
  city: string | null;
  links: ProfileLink[];
  createdAt: string;
  suspended?: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

interface PublicProfilePayload {
  user: PublicProfileUser;
  posts: DemoPost[];
}

export function ProfileView() {
  const userId = useSocialStore((s) => s.viewedProfileUserId);
  const closeProfile = useSocialStore((s) => s.closeProfile);
  const openEditProfile = useSocialStore((s) => s.openEditProfile);
  const allPosts = useSocialStore((s) => s.posts);
  const { user: authUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [live, setLive] = useState<PublicProfilePayload | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const isDemoUser = !!userId && !!DEMO_USER_MAP[userId];
  const isOwnSession =
    !!userId &&
    isAuthenticated &&
    !!authUser?.id &&
    (userId === authUser.id || userId === CURRENT_USER_ID);

  // ── Live fetch for real DB profiles (own + others) ──
  const loadLive = useCallback(async () => {
    if (!userId) return;
    if (isDemoUser && !isOwnSession) return; // pure demo profile — no fetch
    // When the sidebar opens the own-profile shortcut it passes the demo id
    // "u-current" — remap it to the real session user id before querying.
    const targetId = userId === CURRENT_USER_ID && authUser?.id ? authUser.id : userId;
    setLiveLoading(true);
    try {
      const res = await fetch(`/api/profile?id=${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const data = (await res.json()) as PublicProfilePayload;
        setLive(data);
      } else if (res.status === 404) {
        setLive(null);
        toast({ title: 'User not found', description: 'This profile may have been removed.', variant: 'destructive' });
      }
    } catch {
      // Network issue — leave the shell; posts section shows an empty state.
    } finally {
      setLiveLoading(false);
    }
  }, [userId, isDemoUser, isOwnSession, authUser?.id, toast]);

  useEffect(() => {
    setLive(null);
    void loadLive();
  }, [loadLive]);

  // ── Demo-profile path (unchanged data source) ──
  const demoUser = userId ? DEMO_USER_MAP[userId] : undefined;

  const demoUserPosts = useMemo(
    () =>
      allPosts
        .filter((p) => p.authorId === userId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [allPosts, userId],
  );

  if (!userId) return null;

  // ────────────────────────────────────────────────────────────────────────
  // Resolve display data: live (real DB user) or demo.
  // ────────────────────────────────────────────────────────────────────────
  const isLiveProfile = !isDemoUser || isOwnSession;

  const display = isLiveProfile
    ? {
        name: live?.user.name || authUser?.name || 'User',
        handle: live?.user.username || authUser?.email?.split('@')[0] || 'user',
        bio: live?.user.bio || '',
        location: [live?.user.city, live?.user.state].filter(Boolean).join(', '),
        avatar: {
          name: live?.user.name || authUser?.name || 'User',
          initials: live?.user.initials || 'BS',
          avatarGradient: live?.user.avatarGradient || 'from-sky-500 to-indigo-500',
          avatarUrl: live?.user.avatarUrl ?? null,
        },
        links: live?.user.links ?? [],
        followersCount: live?.user.followersCount ?? 0,
        followingCount: live?.user.followingCount ?? 0,
        postsCount: live?.user.postsCount ?? 0,
        createdAt: live?.user.createdAt ?? null,
        suspended: live?.user.suspended ?? false,
        isFollowing: live?.user.isFollowing ?? false,
      }
    : {
        name: demoUser?.name || 'User',
        handle: demoUser?.handle || 'user',
        bio: demoUser?.bio || '',
        location: demoUser?.location || '',
        avatar: {
          name: demoUser?.name || 'User',
          initials: demoUser?.initials || 'U',
          avatarGradient: demoUser?.avatarGradient || 'from-sky-500 to-indigo-500',
          avatarUrl: null as string | null,
        },
        links: [] as ProfileLink[],
        followersCount: demoUser?.followers ?? 0,
        followingCount: demoUser?.following ?? 0,
        postsCount: demoUserPosts.length,
        createdAt: null as string | null,
        suspended: false,
        isFollowing: false,
      };

  const posts: DemoPost[] = isLiveProfile ? live?.posts ?? [] : demoUserPosts;
  const isOwnProfile = isLiveProfile && (live?.user.isOwnProfile || isOwnSession);

  // ── Follow / unfollow (real users only) ──
  async function toggleFollowLive() {
    if (!userId || !isAuthenticated) return;
    setFollowBusy(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        following?: boolean;
        error?: string;
      };
      if (!res.ok) {
        toast({ title: 'Action failed', description: data.error || 'Please try again.', variant: 'destructive' });
        return;
      }
      setLive((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                isFollowing: !!data.following,
                followersCount: Math.max(
                  0,
                  prev.user.followersCount + (data.following ? 1 : -1),
                ),
              },
            }
          : prev,
      );
    } catch {
      toast({ title: 'Network error', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <div className="min-h-full">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={closeProfile}
          aria-label="Back to feed"
          className="rounded-full p-1.5 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1 truncate text-base font-semibold text-foreground">
            {display.name}
            {demoUser?.verified && <BadgeCheck className="h-4 w-4 text-brand" aria-label="Verified" />}
          </h1>
          <p className="text-xs text-muted-foreground">{formatCount(display.postsCount)} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 w-full bg-gradient-to-r from-brand/20 via-brand/10 to-brand/5 sm:h-40" />

      {/* Profile head */}
      <div className="px-4">
        <div className="-mt-12 flex items-end justify-between sm:-mt-14">
          <UserAvatar
            user={display.avatar}
            size="xl"
            className="ring-4 ring-background"
          />
          <div className="mb-1">
            {isOwnProfile ? (
              <button
                type="button"
                onClick={openEditProfile}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit profile
              </button>
            ) : isDemoUser ? (
              <button
                type="button"
                onClick={() =>
                  toast({
                    title: 'Demo profile',
                    description: 'This is a demonstration account — following is illustrative only.',
                  })
                }
                className="rounded-full bg-brand px-5 py-1.5 text-sm font-semibold text-brand-foreground transition-all hover:brightness-105 active:scale-[0.97]"
              >
                Follow
              </button>
            ) : (
              <button
                type="button"
                disabled={followBusy}
                onClick={() => void toggleFollowLive()}
                aria-pressed={display.isFollowing}
                className={cn(
                  'rounded-full px-5 py-1.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  display.isFollowing
                    ? 'border border-border bg-card text-foreground hover:border-destructive/40 hover:text-destructive'
                    : 'bg-brand text-brand-foreground hover:brightness-105',
                )}
              >
                {display.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h2 className="flex items-center gap-1 text-xl font-bold text-foreground">
            {display.name}
            {demoUser?.verified && <BadgeCheck className="h-5 w-5 text-brand" aria-label="Verified" />}
          </h2>
          <p className="text-sm text-muted-foreground">@{display.handle}</p>

          {display.suspended && (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              This account is suspended.
            </p>
          )}

          {!display.suspended && display.bio && (
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
              {display.bio}
            </p>
          )}

          {!display.suspended && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {display.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {display.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <LinkIcon className="h-3.5 w-3.5" />
                bharatsocial.in/{display.handle}
              </span>
              {display.createdAt && (
                <span className="inline-flex items-center gap-1" suppressHydrationWarning>
                  <Calendar className="h-3.5 w-3.5" />
                  Joined{' '}
                  {new Date(display.createdAt).toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          )}

          {/* Profile links */}
          {!display.suspended && display.links.length > 0 && (
            <ul className="mt-2 space-y-1">
              {display.links.slice(0, 4).map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex max-w-full items-center gap-1.5 truncate text-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    <LinkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {link.label || link.url.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex gap-4 text-sm">
            <span>
              <span className="font-semibold text-foreground">{formatCount(display.followingCount)}</span>{' '}
              <span className="text-muted-foreground">Following</span>
            </span>
            <span>
              <span className="font-semibold text-foreground">{formatCount(display.followersCount)}</span>{' '}
              <span className="text-muted-foreground">Followers</span>
            </span>
          </div>
        </div>
      </div>

      {/* Badges & Achievements section — only render for real DB users */}
      {!isDemoUser && userId && (
        <div className="mt-4 border-t border-border">
          <div className="flex items-center gap-2 px-4 pt-4">
            <Award className="h-4 w-4 text-saffron" />
            <h2 className="text-sm font-semibold text-foreground">Badges & Achievements</h2>
          </div>
          <BadgesSection userId={userId} isOwnProfile={!!isOwnProfile} />
        </div>
      )}

      {/* Posts */}
      <div className="mt-4 border-t border-border">
        {liveLoading && posts.length === 0 ? (
          <div className="flex justify-center py-10">
            <span className="text-sm text-muted-foreground">Loading posts…</span>
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="No posts yet"
            description="When this user posts, you’ll see them here."
          />
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
