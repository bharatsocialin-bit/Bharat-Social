'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, BadgeCheck, MapPin, Calendar, Link as LinkIcon, MessageSquareText, Award } from 'lucide-react';
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

export function ProfileView() {
  const userId = useSocialStore((s) => s.viewedProfileUserId);
  const closeProfile = useSocialStore((s) => s.closeProfile);
  const followingIds = useSocialStore((s) => s.followingIds);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const allPosts = useSocialStore((s) => s.posts);
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  // Derive this user's posts with useMemo so the array reference stays
  // stable across renders that don't actually change `allPosts` or `userId`.
  const userPosts = useMemo(
    () =>
      allPosts
        .filter((p) => p.authorId === userId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [allPosts, userId],
  );

  if (!userId) return null;
  const user = DEMO_USER_MAP[userId];

  // If the user is not in the demo map, it's a real DB user — render a
  // minimal profile shell that can still show the BadgesSection.
  const isRealDbUser = !user;
  const displayName = user?.name || (authUser?.name ?? 'User');
  const handle = user?.handle || (authUser?.email?.split('@')[0] ?? 'user');
  const bio = user?.bio || '';
  const location = user?.location || '';

  const isFollowing = user ? followingIds.has(user.id) : false;
  const isMe = userId === CURRENT_USER_ID || (authUser && userId === authUser.id);

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
        <div>
          <h1 className="flex items-center gap-1 text-base font-semibold text-foreground">
            {displayName}
            {user?.verified && <BadgeCheck className="h-4 w-4 text-brand" aria-label="Verified" />}
          </h1>
          <p className="text-xs text-muted-foreground">{formatCount(userPosts.length)} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 w-full bg-gradient-to-r from-brand/20 via-brand/10 to-brand/5 sm:h-40" />

      {/* Profile head */}
      <div className="px-4">
        <div className="-mt-12 flex items-end justify-between sm:-mt-14">
          <UserAvatar
            user={{
              name: displayName,
              initials: user?.initials || displayName.slice(0, 2).toUpperCase(),
              avatarGradient: user?.avatarGradient || 'from-sky-500 to-indigo-500',
            }}
            size="xl"
            className="ring-4 ring-background"
          />
          <div className="mb-1">
            {isMe ? (
              <button
                type="button"
                onClick={() =>
                  toast({
                    title: 'Edit profile',
                    description: 'Profile editing is not part of this Part 1 prototype.',
                  })
                }
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Edit profile
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast({
                      title: 'Cannot follow',
                      description: 'This user is not in the demo user map.',
                    });
                    return;
                  }
                  toggleFollow(user.id);
                  toast({
                    title: isFollowing ? `Unfollowed ${user.name}` : `Following ${user.name}`,
                    description: 'Demonstration only — no real follow relationship is created.',
                  });
                }}
                aria-pressed={isFollowing}
                className={cn(
                  'rounded-full px-5 py-1.5 text-sm font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isFollowing
                    ? 'border border-border bg-card text-foreground hover:border-destructive/40 hover:text-destructive'
                    : 'bg-brand text-brand-foreground hover:brightness-105',
                )}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h2 className="flex items-center gap-1 text-xl font-bold text-foreground">
            {displayName}
            {user?.verified && <BadgeCheck className="h-5 w-5 text-brand" aria-label="Verified" />}
          </h2>
          <p className="text-sm text-muted-foreground">@{handle}</p>
          {bio && (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {bio}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <LinkIcon className="h-3.5 w-3.5" />
              bharatsocial.in/{handle}
            </span>
            <span className="inline-flex items-center gap-1" suppressHydrationWarning>
              <Calendar className="h-3.5 w-3.5" />
              Joined {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="mt-3 flex gap-4 text-sm">
            <button
              type="button"
              className="text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <span className="font-semibold">{formatCount(user?.following || 0)}</span>{' '}
              <span className="text-muted-foreground">Following</span>
            </button>
            <button
              type="button"
              className="text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <span className="font-semibold">{formatCount(user?.followers || 0)}</span>{' '}
              <span className="text-muted-foreground">Followers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Badges & Achievements section — only render for real DB users */}
      {isRealDbUser && (
        <div className="mt-4 border-t border-border">
          <div className="flex items-center gap-2 px-4 pt-4">
            <Award className="h-4 w-4 text-saffron" />
            <h2 className="text-sm font-semibold text-foreground">Badges & Achievements</h2>
          </div>
          <BadgesSection userId={userId} isOwnProfile={!!isMe} />
        </div>
      )}

      {/* Posts */}
      <div className="mt-4 border-t border-border">
        {userPosts.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="No posts yet"
            description="When this user posts, you’ll see them here."
          />
        ) : (
          userPosts.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
