import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { evaluateAndAwardBadges } from '@/lib/badges/evaluator';

// ── POST /api/admin/badges/reconcile/[userId] ──────────────────────────────
// Admin-only: re-evaluate ALL badge criteria for a specific user.
//
// This is the "reconciliation" endpoint — if the fire-and-forget badge
// evaluation in any of the activity routes (post-created, like-created,
// etc.) failed silently (e.g. DB was temporarily unavailable), the user
// might have missed out on a badge they actually earned.
//
// An admin can trigger this endpoint to retroactively check all criteria
// and award any missing badges. Idempotent — existing awards are not
// duplicated (unique constraint on UserBadge [userId, badgeId]).
//
// The reconciliation runs the SAME evaluator as the fire-and-forget path,
// just with a 'generic' trigger type (which checks all criteria types).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { userId } = await params;

    // Verify the user exists.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, suspended: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Count badges before reconciliation.
    const beforeCount = await db.userBadge.count({ where: { userId } });

    // Run the evaluator with a 'generic' trigger — this checks ALL active
    // badge criteria against the user's current DB state.
    const newlyAwarded = await evaluateAndAwardBadges({
      type: 'generic',
      userId,
    });

    const afterCount = await db.userBadge.count({ where: { userId } });

    // Audit record.
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'badge_reconciliation',
        targetUserId: userId,
        description: `Badge reconciliation for @${user.username} by @${admin!.username}. Before: ${beforeCount}, After: ${afterCount}, Newly awarded: ${newlyAwarded.length}.`,
      },
    });

    return NextResponse.json({
      success: true,
      userId,
      username: user.username,
      badgesBefore: beforeCount,
      badgesAfter: afterCount,
      newlyAwarded,
    });
  } catch (e) {
    console.error('Badge reconciliation error:', e);
    return NextResponse.json({ error: 'Failed to reconcile badges.' }, { status: 500 });
  }
}
