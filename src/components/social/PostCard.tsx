'use client';

import { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  BadgeCheck,
  MoreHorizontal,
  Bookmark,
  Trash2,
  Flag,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DemoPost, DemoUser } from '@/lib/types';
import { useSocialStore } from '@/store/useSocialStore';
import { DEMO_USER_MAP } from '@/data/users';
import { formatCount, languageLabel } from '@/lib/format';
import { UserAvatar } from './UserAvatar';
import { ReplyPanel } from './ReplyPanel';
import { ShareDialog } from './ShareDialog';
import { ReportDialog } from './ReportDialog';
import { TimeAgo } from './TimeAgo';
import { TranslateToggle } from './pulse/TranslateToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface PostCardProps {
  post: DemoPost;
}

export function PostCard({ post }: PostCardProps) {
  // When the post comes from the API, it has an `author` object.
  // When it's a demo post, it only has `authorId` — we look it up in DEMO_USER_MAP.
  const author = DEMO_USER_MAP[post.authorId] || (post as PostCardProps['post'] & { author?: DemoUser }).author;
  const toggleLike = useSocialStore((s) => s.toggleLike);
  const toggleRepost = useSocialStore((s) => s.toggleRepost);
  const toggleBookmark = useSocialStore((s) => s.toggleBookmark);
  const addReply = useSocialStore((s) => s.addReply);
  const openProfile = useSocialStore((s) => s.openProfile);
  // Bhasha Bridge — per-post translation toggle (boolean derived from the store Set).
  const isTranslated = useSocialStore((s) => s.translatedPostIds.has(post.id));
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [showReply, setShowReply] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(post.liked);
  const [optimisticLikes, setOptimisticLikes] = useState(post.likes);
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(post.bookmarked);
  const [optimisticReposted, setOptimisticReposted] = useState(post.reposted);
  const [optimisticReposts, setOptimisticReposts] = useState(post.reposts);

  async function handleRepost() {
    if (isAuthenticated) {
      const wasReposted = optimisticReposted;
      setOptimisticReposted(!wasReposted);
      setOptimisticReposts(wasReposted ? optimisticReposts - 1 : optimisticReposts + 1);
      try {
        const res = await fetch(`/api/posts/${post.id}/repost`, { method: 'POST' });
        if (!res.ok) throw new Error('API error');
        toast({
          title: wasReposted ? 'Repost removed' : 'Reposted!',
          description: '',
        });
      } catch {
        setOptimisticReposted(wasReposted);
        setOptimisticReposts(wasReposted ? optimisticReposts + 1 : optimisticReposts - 1);
        toast({ title: 'Error', description: 'Failed to repost', variant: 'destructive' });
      }
    } else {
      toggleRepost(post.id);
    }
  }

  async function handleLike() {
    if (isAuthenticated) {
      // Optimistic update
      const wasLiked = optimisticLiked;
      setOptimisticLiked(!wasLiked);
      setOptimisticLikes(wasLiked ? optimisticLikes - 1 : optimisticLikes + 1);
      try {
        const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
        if (!res.ok) throw new Error('API error');
      } catch {
        // Revert on failure
        setOptimisticLiked(wasLiked);
        setOptimisticLikes(wasLiked ? optimisticLikes + 1 : optimisticLikes - 1);
        toast({ title: 'Error', description: 'Failed to like post', variant: 'destructive' });
      }
    } else {
      toggleLike(post.id);
    }
  }

  async function handleBookmark() {
    if (isAuthenticated) {
      const wasBookmarked = optimisticBookmarked;
      setOptimisticBookmarked(!wasBookmarked);
      try {
        const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: 'POST' });
        if (!res.ok) throw new Error('API error');
        toast({
          title: wasBookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks',
          description: '',
        });
      } catch {
        setOptimisticBookmarked(wasBookmarked);
        toast({ title: 'Error', description: 'Failed to update bookmark', variant: 'destructive' });
      }
    } else {
      toggleBookmark(post.id);
      toast({
        title: post.bookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks',
        description: 'Demonstration only — nothing is stored on a server.',
      });
    }
  }

  if (!author) return null;

  // Determine what content + language chip to show based on the Bhasha Bridge toggle.
  const showTranslation = isTranslated && post.language !== 'en';
  const hasTranslation = Boolean(post.translationPreview);
  const displayedContent =
    showTranslation && hasTranslation ? post.translationPreview : post.content;

  const actionBtnBase =
    'group flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <article className="border-b border-border px-4 py-3 transition-colors hover:bg-muted/30">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => openProfile(author.id)}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open ${author.name}’s profile`}
        >
          <UserAvatar user={author} size="md" />
        </button>

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex items-center gap-1.5 text-[15px]">
            <button
              type="button"
              onClick={() => openProfile(author.id)}
              className="truncate font-semibold text-foreground hover:underline"
            >
              {author.name}
            </button>
            {author.verified && (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-saffron"
                aria-label="Verified account"
              />
            )}
            <span className="truncate text-muted-foreground">@{author.handle}</span>
            <span className="text-muted-foreground">·</span>
            <TimeAgo
              iso={post.createdAt}
              className="shrink-0 text-muted-foreground hover:underline"
            />

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More actions"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleBookmark}
                  >
                    <Bookmark className="mr-2 h-4 w-4" />
                    {optimisticBookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      toast({
                        title: 'Post hidden',
                        description: 'Demonstration only — this prototype does not persist hidden posts.',
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hide post
                  </DropdownMenuItem>
                  {isAuthenticated && post.authorId && !post.authorId.startsWith('u-') && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setReportOpen(true)}
                      >
                        <Flag className="mr-2 h-4 w-4" />
                        Report post
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/blocks', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: post.authorId }),
                            });
                            if (!res.ok) throw new Error('Failed');
                            toast({ title: 'User blocked', description: 'Their posts will no longer appear in your feed.' });
                          } catch {
                            toast({ title: 'Error', description: 'Failed to block user', variant: 'destructive' });
                          }
                        }}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Block user
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Language chip — always shown for non-English posts so the
              original language is visible, even when a translation is shown. */}
          {post.language !== 'en' && (
            <div className="mb-1 mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                {languageLabel(post.language)}
              </span>
              {showTranslation && hasTranslation && (
                <span className="inline-flex items-center rounded-full bg-navy-soft px-2 py-0.5 text-[11px] font-medium text-white">
                  Translated · English
                </span>
              )}
              {showTranslation && !hasTranslation && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                  No translation available
                </span>
              )}
            </div>
          )}

          {/* Content — shows translation when toggled, otherwise the original */}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
            {displayedContent}
          </p>

          {/* Bhasha Bridge notice when translation is requested but none is available */}
          {showTranslation && !hasTranslation && (
            <div className="mt-2 rounded-lg bg-amber-50/60 p-2 text-xs text-amber-800 ring-1 ring-amber-200">
              Bhasha Bridge is in demonstration mode — no real translation
              service is configured. Showing the original {languageLabel(post.language)} post above.
            </div>
          )}

          {/* Action bar */}
          <div className="mt-3 flex items-center justify-between text-muted-foreground">
            {/* Reply */}
            <button
              type="button"
              onClick={() => setShowReply((v) => !v)}
              className={cn(actionBtnBase, 'hover:bg-saffron/10 hover:text-saffron')}
              aria-label="Reply"
              aria-expanded={showReply}
            >
              <MessageCircle className="h-[18px] w-[18px]" />
              <span className="tabular-nums">
                {post.replies.length > 0 ? formatCount(post.replies.length) : ''}
              </span>
            </button>

            {/* Repost */}
            <button
              type="button"
              onClick={handleRepost}
              className={cn(
                actionBtnBase,
                optimisticReposted
                  ? 'text-india-green hover:bg-india-green-soft'
                  : 'hover:bg-india-green-soft hover:text-india-green',
              )}
              aria-pressed={optimisticReposted}
              aria-label={optimisticReposted ? 'Undo repost' : 'Repost'}
            >
              <Repeat2 className="h-[18px] w-[18px]" />
              <span className="tabular-nums">
                {optimisticReposts > 0 ? formatCount(optimisticReposts) : ''}
              </span>
            </button>

            {/* Like */}
            <button
              type="button"
              onClick={handleLike}
              className={cn(
                actionBtnBase,
                optimisticLiked
                  ? 'text-rose-500 hover:bg-rose-50'
                  : 'hover:bg-rose-50 hover:text-rose-500',
              )}
              aria-pressed={optimisticLiked}
              aria-label={optimisticLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={cn('h-[18px] w-[18px] transition-transform', optimisticLiked && 'fill-current scale-110')}
              />
              <span className="tabular-nums">
                {optimisticLikes > 0 ? formatCount(optimisticLikes) : ''}
              </span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className={cn(actionBtnBase, 'hover:bg-saffron/10 hover:text-saffron')}
              aria-label="Share"
            >
              <Share className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Bhasha Bridge — Translate / Original-Translated toggle */}
          {post.language !== 'en' && (
            <div className="mt-2">
              <TranslateToggle
                itemId={post.id}
                originalLanguage={post.language}
                hasTranslation={hasTranslation}
              />
            </div>
          )}

          {/* Inline reply panel */}
          {showReply && (
            <ReplyPanel
              postId={post.id}
              replies={post.replies}
              onSubmit={async (content, lang) => {
                if (isAuthenticated) {
                  try {
                    const res = await fetch(`/api/posts/${post.id}/comments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content, language: lang }),
                    });
                    if (!res.ok) throw new Error('Failed to reply');
                    toast({ title: 'Reply added' });
                    // Reload to show the new reply
                    window.location.reload();
                  } catch {
                    toast({ title: 'Error', description: 'Failed to add reply', variant: 'destructive' });
                  }
                } else {
                  addReply(post.id, content, lang);
                  toast({
                    title: 'Reply added',
                    description: 'Demonstration reply — not saved to any database.',
                  });
                }
              }}
              onCancel={() => setShowReply(false)}
            />
          )}
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        post={post}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        postId={post.id}
        reportedUserId={post.authorId}
        reportedName={author?.handle || author?.name}
      />
    </article>
  );
}
