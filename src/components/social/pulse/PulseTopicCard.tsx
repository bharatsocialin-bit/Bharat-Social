'use client';

import { ArrowRight, Globe2, MapPinned, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PulseTopic } from '@/lib/types';
import { useSocialStore } from '@/store/useSocialStore';
import { languageLabel } from '@/lib/format';
import { TimeAgo } from '@/components/social/TimeAgo';

interface PulseTopicCardProps {
  topic: PulseTopic;
}

export function PulseTopicCard({ topic }: PulseTopicCardProps) {
  const openTopic = useSocialStore((s) => s.openTopic);

  return (
    <button
      type="button"
      onClick={() => openTopic(topic.id)}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-brand/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      aria-label={`Open topic: ${topic.title}`}
    >
      {/* Curated badge — clearly tells the user this is hand-grouped, not auto-detected */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
          <Layers className="h-3 w-3" />
          Manually curated topic
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <TimeAgo iso={topic.createdAt} />
        </span>
      </div>

      <div>
        <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-brand">
          {topic.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-foreground/70 line-clamp-3">
          {topic.summary}
        </p>
      </div>

      {/* Region + language chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinned className="h-3.5 w-3.5" />
          {topic.regions.length} region{topic.regions.length === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Globe2 className="h-3.5 w-3.5" />
          {topic.languages.length} language{topic.languages.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topic.regions.map((r) => (
          <span
            key={r}
            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70"
          >
            {r}
          </span>
        ))}
        {topic.languages.slice(0, 4).map((l) => (
          <span
            key={l}
            className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
          >
            {languageLabel(l)}
          </span>
        ))}
        {topic.languages.length > 4 && (
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            +{topic.languages.length - 4}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          {topic.postIds.length} related post{topic.postIds.length === 1 ? '' : 's'} ·{' '}
          {topic.sources.length} source{topic.sources.length === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-brand group-hover:gap-1.5 transition-all">
          Open topic
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}
