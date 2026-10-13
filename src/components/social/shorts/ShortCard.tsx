'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Music2,
  Volume2,
  VolumeX,
  Play,
  BadgeCheck,
  Plus,
  Languages,
  Flag,
  Trash2,
  Send,
  AlertCircle,
  X,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { formatCount, languageLabel } from '@/lib/format';
import { TimeAgo } from '@/components/social/TimeAgo';
import { UserAvatar } from '@/components/social/UserAvatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ShareDialog } from '@/components/social/ShareDialog';
import { ReportDialog } from '@/components/social/ReportDialog';
import { AuthDialog } from '@/components/auth/AuthDialog';

// The shape returned by GET /api/shorts and GET /api/shorts/[id].
export interface ShortItem {
  id: string;
  creatorId: string;
  caption: string;
  hashtags: string[];
  language: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  audioTitle: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    handle: string;
    initials: string;
    avatarGradient: string;
  };
  likes: number;
  liked: boolean;
  comments: number;
  // Inline comments — only populated by GET /api/shorts/[id].
  commentsList?: Array<{
    id: string;
    authorId: string;
    content: string;
    language: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      handle: string;
      initials: string;
      avatarGradient: string;
    };
  }>;
  reposts: number;
  reposted: boolean;
}

interface ShortCardProps {
  video: ShortItem;
  isActive: boolean;
  onDeleted?: () => void;
}

interface DemoUserShape {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarGradient: string;
  verified?: boolean;
}

export function ShortCard({ video, isActive, onDeleted }: ShortCardProps) {
  const muted = useSocialStore((s) => s.shortsMuted);
  const toggleMuted = useSocialStore((s) => s.toggleShortsMuted);
  const openProfile = useSocialStore((s) => s.openProfile);
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Like state (local + server)
  const [liked, setLiked] = useState(video.liked);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [likePending, setLikePending] = useState(false);

  // Repost state
  const [reposted, setReposted] = useState(video.reposted);
  const [repostCount, setRepostCount] = useState(video.reposts);
  const [repostPending, setRepostPending] = useState(false);

  // Follow state (client-only display; the real follow relationship lives on the server)
  const followingIds = useSocialStore((s) => s.followingIds);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const isFollowing = followingIds.has(video.creatorId);

  // Sync local state when the video prop changes (e.g. when the feed refreshes)
  useEffect(() => {
    setLiked(video.liked);
    setLikeCount(video.likes);
    setReposted(video.reposted);
    setRepostCount(video.reposts);
    setVideoError(false);
    setVideoLoaded(false);
  }, [video.id, video.liked, video.likes, video.reposted, video.reposts]);

  // Autoplay / pause based on whether this card is the active one.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      // Always start muted — browsers block autoplay with sound.
      el.muted = true;
      el.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    } else {
      el.pause();
      Promise.resolve().then(() => {
        setIsPlaying(false);
        setProgress(0);
      });
    }
  }, [isActive]);

  // Sync the muted state with the video element.
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = muted || true; // Always muted on autoplay
  }, [muted]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  }, []);

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setIsPlaying(true));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }

  function handleUnmute() {
    const el = videoRef.current;
    if (el) el.muted = false;
    if (muted) toggleMuted();
    if (el && el.paused) el.play().then(() => setIsPlaying(true));
  }

  function handleMute() {
    const el = videoRef.current;
    if (el) el.muted = true;
    if (!muted) toggleMuted();
  }

  async function toggleLike() {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    if (likePending) return;
    setLikePending(true);
    // Optimistic update
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const res = await fetch(`/api/shorts/${video.id}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLiked(data.liked);
    } catch {
      // Rollback
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast({ title: 'Error', description: 'Failed to toggle like.', variant: 'destructive' });
    } finally {
      setLikePending(false);
    }
  }

  async function toggleRepost() {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    if (repostPending) return;
    setRepostPending(true);
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!prevReposted);
    setRepostCount(prevReposted ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const res = await fetch(`/api/shorts/${video.id}/repost`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setReposted(data.reposted);
    } catch {
      setReposted(prevReposted);
      setRepostCount(prevCount);
      toast({ title: 'Error', description: 'Failed to repost.', variant: 'destructive' });
    } finally {
      setRepostPending(false);
    }
  }

  async function handleDelete() {
    if (!isAuthenticated || !user) return;
    if (video.creatorId !== user.id) return;
    if (!confirm('Delete this short? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/shorts/${video.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      toast({ title: 'Short deleted' });
      setMenuOpen(false);
      onDeleted?.();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete',
        variant: 'destructive',
      });
    }
  }

  // Adapt the creator shape to what UserAvatar expects.
  const creator: DemoUserShape = {
    id: video.creator.id,
    name: video.creator.name,
    handle: video.creator.handle,
    initials: video.creator.initials,
    avatarGradient: video.creator.avatarGradient,
  };

  const isOwn = isAuthenticated && user?.id === video.creatorId;

  return (
    <section
      className="relative h-full w-full snap-start overflow-hidden bg-black"
      aria-label={`Short by ${creator.name}`}
    >
      {/* Video element — or unavailable-video state if the URL is bad */}
      {video.videoUrl && !videoError ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          loop
          playsInline
          muted={muted}
          preload={isActive ? 'auto' : 'none'}
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          onError={() => setVideoError(true)}
          onLoadedData={() => setVideoLoaded(true)}
          poster={video.thumbnailUrl || undefined}
          aria-label={video.caption}
        />
      ) : videoError ? (
        // Video unavailable state
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-6 text-center">
          <AlertCircle className="h-12 w-12 text-amber-400" />
          <h3 className="mt-3 text-base font-semibold text-white">Video unavailable</h3>
          <p className="mt-1 text-sm text-white/60">
            This video could not be loaded. It may have been removed or the file is corrupted.
          </p>
          {isOwn && (
            <button
              type="button"
              onClick={handleDelete}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/40 hover:bg-rose-500/30"
            >
              <Trash2 className="h-4 w-4" />
              Delete this short
            </button>
          )}
        </div>
      ) : (
        // No video URL provided at all (shouldn't happen with DB-backed shorts)
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      )}

      {/* Loading shimmer before the video metadata arrives */}
      {video.videoUrl && !videoLoaded && !videoError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      )}

      {/* Tap-to-play overlay (when paused) */}
      {video.videoUrl && !videoError && !isPlaying && videoLoaded && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity"
          aria-label="Play"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md ring-2 ring-white/40">
            <Play className="h-8 w-8 fill-white text-white" />
          </span>
        </button>
      )}

      {/* Top overlay — language chip + time-ago + mute toggle + menu */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/50 to-transparent px-4 pt-4 pb-8">
        {video.language !== 'en' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            <Languages className="h-3 w-3" />
            {languageLabel(video.language as Parameters<typeof languageLabel>[0])}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-white/80">
          <TimeAgo iso={video.createdAt} />
        </span>
        {video.videoUrl && !videoError && (
          <button
            type="button"
            onClick={muted ? handleUnmute : handleMute}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
        {/* More menu (own = delete, others = report) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="More actions"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
                aria-label="Close menu"
                tabIndex={-1}
              />
              <div className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md">
                {isOwn ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete short
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {video.videoUrl && !videoError && (
        <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-white/20">
          <div
            className="h-full bg-white transition-[width] duration-150"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Bottom-left overlay — creator info + caption */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-16">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openProfile(creator.id)}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
            aria-label={`Open ${creator.name}’s profile`}
          >
            <UserAvatar user={creator} size="md" />
          </button>
          <button
            type="button"
            onClick={() => openProfile(creator.id)}
            className="flex items-center gap-1 font-semibold text-white hover:underline"
          >
            @{creator.handle}
            <BadgeCheck className="h-4 w-4 text-saffron" aria-label="Verified" />
          </button>
          {!isFollowing && !isOwn && (
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthOpen(true);
                  return;
                }
                toggleFollow(creator.id);
              }}
              className="ml-1 inline-flex items-center gap-1 rounded-full border border-white/60 px-3 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus className="h-3 w-3" />
              Follow
            </button>
          )}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-white">{video.caption}</p>

        {/* Hashtags */}
        {video.hashtags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {video.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-saffron hover:underline"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Audio attribution */}
        {video.audioTitle && (
          <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
            <Music2 className="h-3.5 w-3.5 animate-pulse" />
            <span className="truncate">{video.audioTitle}</span>
          </div>
        )}
      </div>

      {/* Right-side action rail */}
      <div className="absolute bottom-20 right-2 z-20 flex flex-col items-center gap-4">
        {/* Like */}
        <button
          type="button"
          onClick={toggleLike}
          disabled={likePending}
          className="flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full disabled:opacity-50"
          aria-label={liked ? 'Unlike' : 'Like'}
          aria-pressed={liked}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors hover:bg-black/50">
            <Heart
              className={cn(
                'h-6 w-6 transition-transform',
                liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white',
              )}
            />
          </span>
          <span className="text-xs font-medium text-white">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              setAuthOpen(true);
              return;
            }
            setCommentsOpen(true);
          }}
          className="flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
          aria-label="Comments"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors hover:bg-black/50">
            <MessageCircle className="h-6 w-6 text-white" />
          </span>
          <span className="text-xs font-medium text-white">{formatCount(video.comments)}</span>
        </button>

        {/* Repost */}
        <button
          type="button"
          onClick={toggleRepost}
          disabled={repostPending}
          className="flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full disabled:opacity-50"
          aria-label={reposted ? 'Undo repost' : 'Repost'}
          aria-pressed={reposted}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors hover:bg-black/50">
            <svg
              viewBox="0 0 24 24"
              className={cn('h-6 w-6 transition-transform', reposted ? 'text-emerald-400 scale-110' : 'text-white')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </span>
          <span className="text-xs font-medium text-white">{formatCount(repostCount)}</span>
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
          aria-label="Share"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-colors hover:bg-black/50">
            <Share2 className="h-6 w-6 text-white" />
          </span>
        </button>
      </div>

      {/* Comments drawer */}
      {commentsOpen && (
        <CommentsDrawer
          shortId={video.id}
          onClose={() => setCommentsOpen(false)}
        />
      )}

      {/* Share dialog */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        post={{
          id: video.id,
          authorId: video.creatorId,
          content: video.caption,
          language: video.language as 'en',
          createdAt: video.createdAt,
          likes: likeCount,
          reposts: repostCount,
          replies: [],
        }}
      />

      {/* Report dialog */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        shortId={video.id}
        reportedUserId={video.creatorId}
        reportedName={video.creator.handle}
      />

      {/* Auth dialog (when not logged in) */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode="login" />
    </section>
  );
}

// ── Comments drawer ───────────────────────────────────────────────────────────

interface CommentItem {
  id: string;
  authorId: string;
  content: string;
  language: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    initials: string;
    avatarGradient: string;
  };
}

function CommentsDrawer({ shortId, onClose }: { shortId: string; onClose: () => void }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shorts/${shortId}/comment`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.comments) {
          setComments(d.comments);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [shortId]);

  async function submit() {
    const trimmed = input.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shorts/${shortId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, language: 'en' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      const data = await res.json();
      setComments((prev) => [...prev, data.reply]);
      setInput('');
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Close comments"
        tabIndex={-1}
      />
      <div className="relative max-h-[60%] rounded-t-2xl border-t border-white/10 bg-slate-900 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">
            Comments {comments.length > 0 && <span className="text-white/50">({comments.length})</span>}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Comments list */}
        <div className="max-h-[40vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/50">
              No comments yet. Be the first to reply.
            </p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-white/5 p-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      user={{
                        name: c.author.name,
                        initials: c.author.initials,
                        avatarGradient: c.author.avatarGradient,
                      }}
                      size="sm"
                    />
                    <span className="text-sm font-semibold text-white">@{c.author.handle}</span>
                    <span className="text-xs text-white/40">
                      <TimeAgo iso={c.createdAt} />
                    </span>
                  </div>
                  <p className="mt-1 pl-9 text-sm text-white/90">{c.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 p-2">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!input.trim() || submitting}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-saffron text-white disabled:opacity-30"
              aria-label="Post comment"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
