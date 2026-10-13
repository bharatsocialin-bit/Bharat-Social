import type { PulseTopic } from '@/lib/types';

// ───────────────────────────────────────────────────────────────────────────
// DEMONSTRATION DATA — manually curated topic cards that bring related posts
// together across languages and regions.
//
// IMPORTANT: Topic grouping is performed BY HAND in this prototype. We do NOT
// claim that automatic topic detection is implemented. Every topic below has
// `manuallyCurated: true` set explicitly so the UI can label it honestly.
// ───────────────────────────────────────────────────────────────────────────

const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60_000).toISOString();

export const PULSE_TOPICS: PulseTopic[] = [
  {
    id: 't-1',
    title: 'How cities are preparing for monsoon transit',
    summary:
      'Reports from Bengaluru, Mumbai and Kochi on the recurring patterns — waterlogged corridors, ferry schedules, and what civic authorities are saying.',
    createdAt: days(2),
    regions: ['Bengaluru', 'Mumbai', 'Kochi'],
    languages: ['en', 'hi'],
    postIds: ['p-001', 'p-006'],
    sources: [
      {
        id: 'ts-1-a',
        label: 'Community photo · ORR waterlogging',
        note: 'Independent community photo, Bengaluru.',
        href: '#',
      },
      {
        id: 'ts-1-b',
        label: 'Railway advisory · Harbour line delays',
        note: 'Official source — railway advisory, Mumbai.',
        href: '#',
        official: true,
      },
    ],
    manuallyCurated: true,
  },
  {
    id: 't-2',
    title: 'Reading circles and music seasons',
    summary:
      'Community reading and music gatherings across Mumbai, Chennai and Kolkata — what is restarting and where to find the schedules.',
    createdAt: days(3),
    regions: ['Mumbai', 'Chennai', 'Kolkata'],
    languages: ['en', 'mr', 'ta', 'bn'],
    postIds: ['p-002', 'p-007'],
    sources: [
      {
        id: 'ts-2-a',
        label: 'Sabha calendar · Margazhi season',
        note: 'Independent source — sabha publication, Chennai.',
        href: '#',
      },
      {
        id: 'ts-2-b',
        label: 'Community post · Marathi reading circle',
        note: 'Independent community post, Mumbai.',
        href: '#',
      },
    ],
    manuallyCurated: true,
  },
  {
    id: 't-3',
    title: 'Heritage walks that locals swear by',
    summary:
      'Three city-level heritage walks — Hyderabad, Jaipur and Ahmedabad — that residents recommend to anyone visiting for a weekend.',
    createdAt: days(4),
    regions: ['Hyderabad', 'Jaipur', 'Ahmedabad'],
    languages: ['en', 'te', 'gu'],
    postIds: ['p-009', 'p-015'],
    sources: [
      {
        id: 'ts-3-a',
        label: 'Community post · Hyderabad old-city walk',
        note: 'Independent community post.',
        href: '#',
      },
      {
        id: 'ts-3-b',
        label: 'Jawahar Kala Kendra · weekend calendar',
        note: 'Independent source — cultural institution listing, Jaipur.',
        href: '#',
      },
      {
        id: 'ts-3-c',
        label: 'State tourism office · kite festival calendar',
        note: 'Official source — government tourism calendar, Ahmedabad.',
        href: '#',
        official: true,
      },
    ],
    manuallyCurated: true,
    translationPreview: undefined,
  },
  {
    id: 't-4',
    title: 'Green cover and the city',
    summary:
      'Conversations across Pune, Bengaluru and Bhubaneswar on hill corridors, lake cleanups and urban green cover — civic proposals and what residents are doing.',
    createdAt: days(5),
    regions: ['Pune', 'Bengaluru', 'Bhubaneswar'],
    languages: ['en'],
    postIds: ['p-010'],
    sources: [
      {
        id: 'ts-4-a',
        label: 'Resident group · Vetal Tekdi letter',
        note: 'Independent source — resident group, Pune.',
        href: '#',
      },
      {
        id: 'ts-4-b',
        label: 'Lake Trust · Kaikondrahalli cleanup calendar',
        note: 'Official source — civic / community trust calendar, Bengaluru.',
        href: '#',
        official: true,
      },
    ],
    manuallyCurated: true,
  },
];

export const PULSE_TOPIC_MAP: Record<string, PulseTopic> = PULSE_TOPICS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<string, PulseTopic>,
);
