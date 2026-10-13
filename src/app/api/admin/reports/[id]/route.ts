import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// PATCH /api/admin/reports/[id] — update report status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const { status } = await request.json();

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    const report = await db.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    const updated = await db.report.update({
      where: { id },
      data: { status },
    });

    // Create audit record
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'report_updated',
        targetReportId: id,
        targetPostId: report.postId,
        targetUserId: report.reportedUserId,
        description: `Report ${id.slice(0, 12)}… status changed to "${status}" by admin @${admin!.username}`,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error('Admin report update error:', error);
    return NextResponse.json({ error: 'Failed to update report.' }, { status: 500 });
  }
}
