import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── GET /api/badges/user/[userId] ───────────────────────────────────────────
// Returns a specific user's earned badges + progress. Used by the profile
// page to display another user's badges.
//
// Public (no auth required) — badge definitions are not secret. We don't
// expose progress for inactive chat badges (they're hidden from the UI).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, suspended: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Fetch all active badge definitions.
    const badges = await db.badge.findMany({
      where: { active: true },
      orderBy: [{ group: 'asc' }, { rarity: 'asc' }, { createdAt: 'asc' }],
    });

    // Fetch this user's earned badges + progress.
    const [earned, progressRows] = await Promise.all([
      db.userBadge.findMany({
        where: { userId },
        select: {
          badge: { select: { slug: true } },
          awardedAt: true,
        },
      }),
      db.badgeProgress.findMany({
        where: { userId },
        select: {
          badge: { select: { slug: true } },
          current: true,
          target: true,
        },
      }),
    ]);
    const earnedMap = new Map(earned.map((e) => [e.badge.slug, e.awardedAt]));
    const progressMap = new Map(progressRows.map((p) => [p.badge.slug, { current: p.current, target: p.target }]));

    // Fetch the user's featured badge (if any).
    let featuredBadgeSlug: string | null = null;
    if (user) {
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { featuredBadgeId: true },
      });
      if (u?.featuredBadgeId) {
        const fb = await db.userBadge.findUnique({
          where: { id: u.featuredBadgeId },
          select: { badge: { select: { slug: true } } },
        });
        featuredBadgeSlug = fb?.badge.slug || null;
      }
    }

    return NextResponse.json({
      badges: badges.map((b) => ({
        slug: b.slug,
        name: b.name,
        description: b.description,
        nameTranslations: safeParse(b.nameTranslations, {}),
        descriptionTranslations: safeParse(b.descriptionTranslations, {}),
        icon: b.icon,
        gradient: b.gradient,
        rarity: b.rarity,
        group: b.group,
        hint: b.hint,
        earned: earnedMap.has(b.slug),
        awardedAt: earnedMap.get(b.slug)?.toISOString() || null,
        progress: progressMap.get(b.slug) || null,
        isFeatured: featuredBadgeSlug === b.slug,
      })),
      earnedCount: earned.length,
      totalCount: badges.length,
    });
  } catch (e) {
    console.error('Error fetching user badges:', e);
    return NextResponse.json({ error: 'Failed to fetch user badges.' }, { status: 500 });
  }
}

function safeParse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
