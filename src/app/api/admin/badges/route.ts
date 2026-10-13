import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// ── GET /api/admin/badges ──────────────────────────────────────────────────
// Admin-only: list all badge definitions with award counts.
export async function GET() {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const badges = await db.badge.findMany({
      orderBy: [{ group: 'asc' }, { rarity: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { userBadges: true },
        },
      },
    });

    return NextResponse.json({
      badges: badges.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        icon: b.icon,
        gradient: b.gradient,
        rarity: b.rarity,
        group: b.group,
        criteriaType: b.criteriaType,
        criteriaValue: b.criteriaValue,
        active: b.active,
        hint: b.hint,
        awardCount: b._count.userBadges,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
      admin: admin ? { id: admin.id, username: admin.username } : null,
    });
  } catch (e) {
    console.error('Admin badges list error:', e);
    return NextResponse.json({ error: 'Failed to fetch badges.' }, { status: 500 });
  }
}
