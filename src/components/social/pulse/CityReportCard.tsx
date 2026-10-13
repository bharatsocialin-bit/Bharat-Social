'use client';

import { Users, Clock, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CityReport } from '@/lib/types';
import { useSocialStore } from '@/store/useSocialStore';
import { languageLabel, relativeTime } from '@/lib/format';
import { TimeAgo } from '@/components/social/TimeAgo';
import { ReportStatusBadge, OfficialSourcePill } from './ReportStatusBadge';
import { TranslateToggle } from './TranslateToggle';
import { useToast } from '@/hooks/use-toast';

interface CityReportCardProps {
  report: CityReport;
}

export function CityReportCard({ report }: CityReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const isTranslated = useSocialStore((s) => s.translatedPostIds.has(report.id));
  const { toast } = useToast();

  // Pick which content to show based on the Bhasha Bridge toggle.
  const showTranslation = isTranslated && report.language !== 'en';
  const displaySummary = showTranslation && report.translationPreview
    ? report.translationPreview
    : report.summary;
  const displayBody = showTranslation && report.translationPreview
    ? report.translationPreview
    : report.body;

  const hasTranslation = Boolean(report.translationPreview);

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      aria-labelledby={`report-title-${report.id}`}
    >
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {report.category}
          </span>
          {report.language !== 'en' && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {languageLabel(report.language)}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <TimeAgo iso={report.createdAt} />
          </span>
        </div>

        <h3
          id={`report-title-${report.id}`}
          className="mt-2 text-base font-semibold leading-snug text-foreground"
        >
          {report.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-foreground/80">
          {displaySummary}
        </p>

        {/* Status badge — always visible */}
        <div className="mt-3">
          <ReportStatusBadge status={report.status} variant="compact" />
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-b border-border bg-muted/20 p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {displayBody}
          </p>

          {/* Translation notice for non-English posts without translation */}
          {showTranslation && !hasTranslation && (
            <div className="mt-3 rounded-lg bg-amber-50/60 p-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
              Bhasha Bridge is in demonstration mode — no real translation
              service is configured. The original {languageLabel(report.language)}{' '}
              text is shown above.
            </div>
          )}

          {/* Why this status — full explanation */}
          <div className="mt-4">
            <ReportStatusBadge
              status={report.status}
              variant="full"
              reason={report.statusReason}
            />
          </div>

          {/* Community count */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              <span className="font-semibold text-foreground/70">{report.communityReports}</span>{' '}
              community members surfaced this report
            </span>
          </div>
        </div>
      )}

      {/* Evidence */}
      {evidenceOpen && (
        <div className="border-b border-border bg-background px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Supporting evidence
          </h4>
          <ul className="space-y-2">
            {report.evidence.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-border bg-card p-2.5 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={e.href ?? '#'}
                    onClick={(ev) => {
                      ev.preventDefault();
                      toast({
                        title: 'Demonstration link',
                        description:
                          'This is a placeholder link in the prototype — no real evidence URL is configured yet.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {e.label}
                  </a>
                  {e.official && <OfficialSourcePill />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{e.note}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Likes and reposts never establish truth. Status is based on independent
            corroboration and named official sources only.
          </p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Read full report
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setEvidenceOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={evidenceOpen}
        >
          <Link2 className="h-3.5 w-3.5" />
          {report.evidence.length} source{report.evidence.length === 1 ? '' : 's'}
        </button>

        <div className="ml-auto">
          <TranslateToggle
            itemId={report.id}
            originalLanguage={report.language}
            hasTranslation={hasTranslation}
          />
        </div>
      </div>
    </article>
  );
}
