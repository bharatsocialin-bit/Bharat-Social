import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// ── PATCH /api/admin/badges/[id] ───────────────────────────────────────────
// Admin-only: edit a badge definition. Supports:
//   - activating / deactivating (toggle `active`)
//   - editing description, hint
//   - changing rarity (within allowed values)
//
// Admin CANNOT change the slug, criteriaType, criteriaValue, name, icon,
// or gradient via this route — those are part of the badge identity and
// should only be changed via a schema migration + seed update.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { active, description, hint, rarity } = body;

    const existing = await db.badge.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Badge not found.' }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    let action: string | null = null;
    let description_for_audit = '';

    if (active !== undefined) {
      if (typeof active !== 'boolean') {
        return NextResponse.json({ error: 'active must be boolean.' }, { status: 400 });
      }
      update.active = active;
      action = active ? 'badge_activated' : 'badge_deactivated';
      description_for_audit = `Badge "${existing.slug}" ${active ? 'activated' : 'deactivated'} by @${admin!.username}`;
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        return NextResponse.json({ error: 'description cannot be empty.' }, { status: 400 });
      }
      if (description.length > 500) {
        return NextResponse.json({ error: 'description too long (max 500).' }, { status: 400 });
      }
      update.description = description.trim();
      if (!action) {
        action = 'badge_description_updated';
        description_for_audit = `Badge "${existing.slug}" description updated by @${admin!.username}`;
      }
    }
    if (hint !== undefined) {
      if (hint === null) {
        update.hint = null;
      } else if (typeof hint === 'string') {
        if (hint.length > 500) {
          return NextResponse.json({ error: 'hint too long (max 500).' }, { status: 400 });
        }
        update.hint = hint.trim() || null;
      } else {
        return NextResponse.json({ error: 'hint must be string or null.' }, { status: 400 });
      }
    }
    if (rarity !== undefined) {
      if (!['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(rarity)) {
        return NextResponse.json({ error: 'Invalid rarity.' }, { status: 400 });
      }
      update.rarity = rarity;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const updated = await db.badge.update({
      where: { id },
      data: update,
    });

    // Audit record (only for activation/description changes — those are the
    // high-stakes ones).
    if (action) {
      await db.moderationAction.create({
        data: {
          adminId: admin!.id,
          action,
          targetBadgeId: id,
          description: description_for_audit,
        },
      });
    }

    return NextResponse.json({
      badge: {
        id: updated.id,
        slug: updated.slug,
        active: updated.active,
        description: updated.description,
        hint: updated.hint,
        rarity: updated.rarity,
      },
    });
  } catch (e) {
    console.error('Admin badge update error:', e);
    return NextResponse.json({ error: 'Failed to update badge.' }, { status: 500 });
  }
}

// ── GET /api/admin/badges/[id]/awards ─────────────────────────────────────
// (Note: this would be a separate route, but for simplicity we expose award
// history inline via the main GET /api/admin/badges response. If admins
// need a per-badge award list, we'd add /api/admin/badges/[id]/awards.)
