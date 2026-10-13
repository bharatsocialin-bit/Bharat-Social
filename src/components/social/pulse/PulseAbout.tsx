'use client';

import {
  Activity,
  Languages,
  ShieldCheck,
  Layers,
  CircleDashed,
  Users,
  BadgeCheck,
} from 'lucide-react';

/** "About" tab — explains what India Pulse is and how Community Signal works. */
export function PulseAbout() {
  return (
    <div className="space-y-4 p-4">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-brand-soft/40 via-card to-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Activity className="h-5 w-5 text-brand" />
          What is India Pulse?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          India Pulse is a signature layer of BharatSocial that surfaces
          city-level public conversations and groups related stories across
          languages and regions. It is built around four ideas:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-foreground/80">
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            <span>
              <span className="font-medium text-foreground">City Pulse</span> —
              discover public events, civic issues and community discussions
              from the city you care about.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            <span>
              <span className="font-medium text-foreground">Bhasha Bridge</span> —
              read posts in any Indian language and toggle an English
              demonstration translation when one is available.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            <span>
              <span className="font-medium text-foreground">Community Signal</span> —
              every report carries a transparent verification status, with
              supporting evidence and a clear reason for the status.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            <span>
              <span className="font-medium text-foreground">One Story, Many Perspectives</span> —
              cross-region topic cards bring related posts together so you can
              read multiple sides of the same story.
            </span>
          </li>
        </ul>
      </section>

      {/* Community Signal explainer */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-brand" />
          How Community Signal works
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          Every India Pulse report carries one of three transparent statuses.
          Importantly, <span className="font-medium text-foreground">likes and popularity never establish that something is true</span>.
          Status is assigned only by independent corroboration and named official sources.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatusCard
            icon={CircleDashed}
            tone="amber"
            title="Unverified"
            body="Community report. No independent corroboration and no official confirmation yet."
          />
          <StatusCard
            icon={Users}
            tone="sky"
            title="Independently Corroborated"
            body="At least one independent account has surfaced the same report. No official confirmation yet."
          />
          <StatusCard
            icon={BadgeCheck}
            tone="emerald"
            title="Confirmed by Source"
            body="A named official source — civic authority, government body, or verified journalist — has confirmed the report."
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Community reports and official-source confirmation are visually
          distinguished. We do not label users or posts as “verified” without
          an actual verification process behind the badge.
        </p>
      </section>

      {/* Bhasha Bridge explainer */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Languages className="h-5 w-5 text-brand" />
          Bhasha Bridge languages
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          The architecture is extensible — adding a new language is just a
          matter of appending a code in <code className="rounded bg-muted px-1 py-0.5 text-xs">lib/types.ts</code>,
          its label in <code className="rounded bg-muted px-1 py-0.5 text-xs">lib/format.ts</code>,
          and (optionally) a demonstration translation on a post.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            'English',
            'हिन्दी',
            'తెలుగు',
            'தமிழ்',
            'বাংলা',
            'मराठी',
            'ಕನ್ನಡ',
            'മലയാളം',
            'ગુજરાતી',
          ].map((l) => (
            <span
              key={l}
              className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {l}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          In this prototype, the Translate button demonstrates the interface
          only — no real translation service is configured. We never claim a
          translation succeeded when it didn’t.
        </p>
      </section>

      {/* Stories explainer */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Layers className="h-5 w-5 text-brand" />
          About “One Story, Many Perspectives”
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          Each topic card brings together related posts from across languages
          and regions. Every card shows the regions and languages it spans,
          the number of related posts, and any supporting sources.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Topic grouping is performed by hand for this prototype. We do not
          claim that automatic topic detection is implemented.
        </p>
      </section>

      {/* Demonstration-only notice */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Demonstration data.</span> All cities,
          reports, topics, evidence and translations shown here are fictional
          demonstration content. None of these describe real events, and no
          real news source or civic authority has confirmed any of them.
        </p>
      </section>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: 'amber' | 'sky' | 'emerald';
  title: string;
  body: string;
}) {
  const tones: Record<typeof tone, string> = {
    amber: 'bg-amber-50/60 ring-amber-200 text-amber-700',
    sky: 'bg-sky-50/60 ring-sky-200 text-sky-700',
    emerald: 'bg-emerald-50/60 ring-emerald-200 text-emerald-700',
  };
  return (
    <div className={`rounded-xl p-3 ring-1 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">{body}</p>
    </div>
  );
}
