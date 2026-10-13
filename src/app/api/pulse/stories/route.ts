import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeParsePostIds } from '@/lib/parse';

// GET /api/pulse/stories — list pulse stories (public, all statuses visible)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // filter by status
    const region = searchParams.get('region'); // filter by region
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1', 10), 1), 50);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (region) where.region = { contains: region };

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
        language: s.language,
        status: s.status,
        evidenceSource: s.evidenceSource,
        evidenceNote: s.evidenceNote,
        postIds: safeParsePostIds(s.postIds),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Stories list error:', error);
    return NextResponse.json({ error: 'Failed to fetch stories.' }, { status: 500 });
  }
}
