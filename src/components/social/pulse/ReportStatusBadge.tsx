'use client';

import {
  CircleDashed,
  Users,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/lib/types';

interface ReportStatusBadgeProps {
  status: ReportStatus;
  /** Compact = chip-style, used inline. Default = full card-style with explanation. */
  variant?: 'compact' | 'full';
  /** Optional reason text shown in `full` variant. */
  reason?: string;
  className?: string;
}

const STATUS_META: Record<
  ReportStatus,
  {
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Tailwind classes for the badge chip. */
    chip: string;
    /** Tailwind classes for the explanation card background. */
    card: string;
    description: string;
  }
> = {
  unverified: {
    label: 'Unverified',
    shortLabel: 'Unverified',
    icon: CircleDashed,
    chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    card: 'bg-amber-50/60 ring-1 ring-amber-200',
    description:
      'Community report. Not yet corroborated by an independent account or confirmed by an official source.',
  },
  corroborated: {
    label: 'Independently Corroborated',
    shortLabel: 'Corroborated',
    icon: Users,
    chip: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    card: 'bg-sky-50/60 ring-1 ring-sky-200',
    description:
      'At least one independent account has surfaced the same report. No official source has confirmed it yet.',
  },
  'confirmed-by-source': {
    label: 'Confirmed by Source',
    shortLabel: 'Confirmed',
    icon: ShieldCheck,
    chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    card: 'bg-emerald-50/60 ring-1 ring-emerald-200',
    description:
      'A named official source (civic authority, government body, or verified journalist) has confirmed the report.',
  },
};

export function ReportStatusBadge({
  status,
  variant = 'compact',
  reason,
  className,
}: ReportStatusBadgeProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          meta.chip,
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {meta.shortLabel}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl p-3 text-sm',
        meta.card,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            meta.chip,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
      </div>
      <p className="mt-2 text-foreground/80">{meta.description}</p>
      {reason && (
        <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/70">Why this status: </span>
          {reason}
        </p>
      )}
    </div>
  );
}

/** Small "official source" pill used next to evidence items. */
export function OfficialSourcePill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200',
        className,
      )}
    >
      <BadgeCheck className="h-3 w-3" />
      Official
    </span>
  );
}
