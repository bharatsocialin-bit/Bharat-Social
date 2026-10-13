import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { safeParsePostIds } from '@/lib/parse';

// GET /api/admin/stories — list all stories for admin management
export async function GET(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10), 1), 100);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [stories, total] = await Promise.all([
      db.pulseStory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.pulseStory.count({ where }),
    ]);

    return NextResponse.json({
      stories: stories.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        region: s.region,
        status: s.status,
        evidenceSource: s.evidenceSource,
        evidenceNote: s.evidenceNote,
        postIds: safeParsePostIds(s.postIds),
        createdBy: s.createdBy,
        updatedBy: s.updatedBy,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin stories list error:', error);
    return NextResponse.json({ error: 'Failed to fetch stories.' }, { status: 500 });
  }
}

// POST /api/admin/stories — create a new story
export async function POST(request: Request) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { title, summary, region, language, postIds, evidenceSource, evidenceNote, status } = await request.json();

    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: 'Title is required (min 3 characters).' }, { status: 400 });
    }
    if (!summary || summary.trim().length < 10) {
      return NextResponse.json({ error: 'Summary is required (min 10 characters).' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['unverified', 'corroborated', 'confirmed'];
    const storyStatus = validStatuses.includes(status) ? status : 'unverified';

    // If status is corroborated or confirmed, evidence is required
    if (storyStatus !== 'unverified' && (!evidenceSource || evidenceSource.trim().length < 3)) {
      return NextResponse.json(
        { error: 'Evidence source is required when assigning a non-unverified status.' },
        { status: 400 },
      );
    }

    // Validate postIds if provided: must be an array of strings.
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

    const story = await db.pulseStory.create({
      data: {
        title: title.trim(),
        summary: summary.trim(),
        region: region?.trim() || null,
        language: language || 'en',
        postIds: JSON.stringify(postIds || []),
        status: storyStatus,
        evidenceSource: evidenceSource?.trim() || null,
        evidenceNote: evidenceNote?.trim() || null,
        createdBy: admin!.id,
        updatedBy: admin!.id,
      },
    });

    // Create audit record. Use targetStoryId (NOT targetReportId) so the FK
    // column actually matches the entity being audited.
    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'story_created',
        targetStoryId: story.id,
        description: `Pulse story "${title.slice(0, 40)}…" created with status "${storyStatus}" by admin @${admin!.username}`,
      },
    });

    return NextResponse.json({ story: { id: story.id } }, { status: 201 });
  } catch (error) {
    console.error('Story create error:', error);
    return NextResponse.json({ error: 'Failed to create story.' }, { status: 500 });
  }
}
