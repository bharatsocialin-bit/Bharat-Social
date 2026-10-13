import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ── GET /api/quiz/achievements ──────────────────────────────────────────────
// Returns all achievement definitions + which ones the current user has earned.
// If not authenticated, returns the definitions with `earned: false` for all.
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    const all = await db.quizAchievement.findMany({
      orderBy: { createdAt: 'asc' },
    });

    let earnedSlugs = new Set<string>();
    if (currentUser) {
      const earned = await db.userAchievement.findMany({
        where: { userId: currentUser.id },
        select: { achievement: { select: { slug: true } }, awardedAt: true },
      });
      earnedSlugs = new Set(earned.map((e) => e.achievement.slug));
    }

    return NextResponse.json({
      achievements: all.map((a) => ({
        slug: a.slug,
        name: a.name,
        description: a.description,
        nameTranslations: safeParse(a.nameTranslations, {}),
        descriptionTranslations: safeParse(a.descriptionTranslations, {}),
        icon: a.icon,
        gradient: a.gradient,
        criteriaType: a.criteriaType,
        criteriaValue: a.criteriaValue,
        earned: earnedSlugs.has(a.slug),
      })),
    });
  } catch (e) {
    console.error('Error fetching achievements:', e);
    return NextResponse.json({ error: 'Failed to fetch achievements.' }, { status: 500 });
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
