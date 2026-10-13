'use client';

import { useMemo } from 'react';
import { ArrowLeft, Layers, MapPinned, Globe2, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { PULSE_TOPIC_MAP } from '@/data/pulse-topics';
import { DEMO_USER_MAP } from '@/data/users';
import { languageLabel, relativeTime } from '@/lib/format';
import { TimeAgo } from '@/components/social/TimeAgo';
import { PostCard } from '@/components/social/PostCard';
import { OfficialSourcePill } from './ReportStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/social/EmptyState';

/** Detail view for a single India Pulse topic. */
export function PulseTopicDetail() {
  const topicId = useSocialStore((s) => s.viewedTopicId);
  const closeTopic = useSocialStore((s) => s.closeTopic);
  const posts = useSocialStore((s) => s.posts);
  const { toast } = useToast();

  const topic = topicId ? PULSE_TOPIC_MAP[topicId] : undefined;

  // Derive the related posts list with useMemo so the array reference
  // stays stable across renders that don't actually change `posts` or `topic`.
  const relatedPosts = useMemo(() => {
    if (!topic) return [];
    return topic.postIds
      .map((id) => posts.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [topic, posts]);

  if (!topic) {
    // Shouldn't normally happen — but we always want a graceful empty state.
    return (
      <EmptyState
        title="Topic not found"
        description="This topic may have been removed. Go back to stories to browse other topics."
        action={
          <button
            type="button"
            onClick={closeTopic}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back to stories
          </button>
        }
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={closeTopic}
          aria-label="Back to India Pulse stories"
          className="rounded-full p-1.5 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
            <Layers className="h-3 w-3" />
            Manually curated topic
          </span>
          <h1 className="mt-1 truncate text-base font-semibold text-foreground">
            {topic.title}
          </h1>
        </div>
      </div>

      {/* Topic header */}
      <div className="border-b border-border bg-gradient-to-br from-brand-soft/40 via-card to-card p-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          {topic.summary}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPinned className="h-3.5 w-3.5" />
            {topic.regions.join(' · ')}
          </span>
          <span className="inline-flex items-center gap-1">
            <Globe2 className="h-3.5 w-3.5" />
            {topic.languages.map(languageLabel).join(' · ')}
          </span>
          <span className="inline-flex items-center gap-1">
            Curated <TimeAgo iso={topic.createdAt} />
          </span>
        </div>
      </div>

      {/* Supporting sources */}
      <div className="border-b border-border p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Supporting sources ({topic.sources.length})
        </h2>
        <ul className="space-y-2">
          {topic.sources.map((s) => (
            <li
              key={s.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={s.href ?? '#'}
                    onClick={(ev) => {
                      ev.preventDefault();
                      toast({
                        title: 'Demonstration link',
                        description:
                          'Placeholder link in the prototype — no real evidence URL is configured yet.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {s.label}
                  </a>
                  {s.official && <OfficialSourcePill />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Note: topics are grouped by hand for this prototype. We do not claim
          that automatic topic detection is implemented.
        </p>
      </div>

      {/* Related posts */}
      <div>
        <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Related posts ({relatedPosts.length})
        </h2>
        {relatedPosts.length === 0 ? (
          <EmptyState
            title="No related posts available"
            description="The posts grouped into this topic may have been removed from the prototype feed."
          />
        ) : (
          <div className="mt-1">
            {relatedPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
