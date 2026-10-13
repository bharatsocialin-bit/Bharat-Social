import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// PATCH /api/admin/stories/[id] — update story status (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const { status, evidenceSource, evidenceNote, title, summary, region, postIds } = await request.json();

    const story = await db.pulseStory.findUnique({ where: { id } });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    // Validate status
    const validStatuses = ['unverified', 'corroborated', 'confirmed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    // If upgrading to corroborated or confirmed, evidence is required
    const newStatus = status || story.status;
    if (newStatus !== 'unverified') {
      const effectiveEvidence = evidenceSource || story.evidenceSource;
      if (!effectiveEvidence || effectiveEvidence.trim().length < 3) {
        return NextResponse.json(
          { error: 'Evidence source is required when assigning a non-unverified status.' },
          { status: 400 },
        );
      }
    }

    // Validate postIds if provided: must be array of strings, max 50 entries.
    if (postIds !== undefined) {
      if (!Array.isArray(postIds)) {
        return NextResponse.json({ error: 'postIds must be an array of strings.' }, { status: 400 });
      }
      const valid = postIds.every((p: unknown) => typeof p === 'string' && p.length > 0 && p.length <= 100);
      if (!valid) {
        return NextResponse.json({ error: 'postIds entries must be non-empty strings (max 100 chars).' }, { status: 400 });
      }
      if (postIds.length > 50) {
        return NextResponse.json({ error: 'postIds cannot have more than 50 entries.' }, { status: 400 });
      }
    }

    const updated = await db.pulseStory.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(evidenceSource !== undefined && { evidenceSource: evidenceSource?.trim() || null }),
        ...(evidenceNote !== undefined && { evidenceNote: evidenceNote?.trim() || null }),
        ...(title && { title: title.trim() }),
        ...(summary && { summary: summary.trim() }),
        ...(region !== undefined && { region: region?.trim() || null }),
        ...(postIds !== undefined && { postIds: JSON.stringify(postIds) }),
        updatedBy: admin!.id,
      },
    });

    // Create audit record for status change. Use targetStoryId.
    if (status && status !== story.status) {
      await db.moderationAction.create({
        data: {
          adminId: admin!.id,
          action: 'story_status_changed',
          targetStoryId: id,
          description: `Story status changed from "${story.status}" to "${status}" by admin @${admin!.username}`,
        },
      });
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Story update error:', error);
    return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 });
  }
}

// DELETE /api/admin/stories/[id] — delete a story (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    const confirmHeader = request.headers.get('x-confirm-delete');
    if (confirmHeader !== 'true') {
      return NextResponse.json(
        { error: 'Confirmation required. Add x-confirm-delete: true header.' },
        { status: 400 },
      );
    }

    const story = await db.pulseStory.findUnique({ where: { id } });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    await db.pulseStory.delete({ where: { id } });

    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'story_deleted',
        targetStoryId: id,
        description: `Story deleted by admin @${admin!.username}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Story delete error:', error);
    return NextResponse.json({ error: 'Failed to delete story.' }, { status: 500 });
  }
}
