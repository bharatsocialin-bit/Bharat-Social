import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── GET /api/badges ─────────────────────────────────────────────────────────
// Returns all badge definitions (including inactive chat/community badges
// so the UI can show them as "coming soon"). For each badge, includes
// whether the current user has earned it + their progress (if applicable).
export async function GET() {
  try {
    // Lazy-import getCurrentUser to avoid circular issues.
    const { getCurrentUser } = await import('@/lib/auth/getCurrentUser');
    const currentUser = await getCurrentUser();

    const badges = await db.badge.findMany({
      where: { active: true }, // Hide inactive badges from regular users
      orderBy: [{ group: 'asc' }, { rarity: 'asc' }, { createdAt: 'asc' }],
    });

    if (!currentUser) {
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
          criteriaType: b.criteriaType,
          criteriaValue: b.criteriaValue,
          active: b.active,
          hint: b.hint,
          earned: false,
          progress: null,
        })),
        currentUserEarnedCount: 0,
      });
    }

    // Load earned badges + progress for the current user.
    const [earned, progressRows] = await Promise.all([
      db.userBadge.findMany({
        where: { userId: currentUser.id },
        select: {
          badge: { select: { slug: true } },
          awardedAt: true,
        },
      }),
      db.badgeProgress.findMany({
        where: { userId: currentUser.id },
        select: {
          badge: { select: { slug: true } },
          current: true,
          target: true,
        },
      }),
    ]);
    const earnedMap = new Map(earned.map((e) => [e.badge.slug, e.awardedAt]));
    const progressMap = new Map(progressRows.map((p) => [p.badge.slug, { current: p.current, target: p.target }]));

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
        criteriaType: b.criteriaType,
        criteriaValue: b.criteriaValue,
        active: b.active,
        hint: b.hint,
        earned: earnedMap.has(b.slug),
        awardedAt: earnedMap.get(b.slug)?.toISOString() || null,
        progress: progressMap.get(b.slug) || null,
      })),
      currentUserEarnedCount: earned.length,
    });
  } catch (e) {
    console.error('Error fetching badges:', e);
    return NextResponse.json({ error: 'Failed to fetch badges.' }, { status: 500 });
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
