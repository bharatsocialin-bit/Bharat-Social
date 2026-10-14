import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import {
  coerceBgKey,
  coerceTextColor,
  isStoryKind,
  STORY_ARCHIVE_RETENTION_MS,
  type StoryDTO,
  type StoryKind,
  type StoryLinkPreview,
} from '@/lib/pulse/user-stories';

// ============================================================================
// GET /api/pulse/stories/user/archive — creator's OWN archived stories.
//
// Returns stories authored by the signed-in user that have been archived
// (either naturally by the 24h sweep OR by the creator deleting them) within
// the last 7 days. Older archived stories are purged by the sweep and will
// not appear here.
//
// Auth required: only the creator can see their own archive. Anonymous
// visitors get 401.
// ============================================================================

interface RawStoryRow {
  id: string;
  authorId: string;
  kind: string;
  textContent: string | null;
  mediaUrl: string | null;
  linkUrl: string | null;
  linkPreview: unknown;
  backgroundColor: string;
  textColor: string;
  createdAt: Date;
  expiresAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
  views: Array<{ viewerId: string }>;
  _count: { views: number };
  author: {
    id: string;
    username: string;
    name: string | null;
    avatarGradient: string;
    initials: string;
    avatarUrl: string | null;
    suspended: boolean;
  };
}

function toStoryDTO(s: RawStoryRow, viewerId: string | null): StoryDTO {
  const kind: StoryKind = isStoryKind(s.kind) ? s.kind : 'text';
  let linkPreview: StoryLinkPreview | null = null;
  if (s.linkPreview && typeof s.linkPreview === 'object') {
    const lp = s.linkPreview as Record<string, unknown>;
    linkPreview = {
      title: typeof lp.title === 'string' ? lp.title : null,
      description: typeof lp.description === 'string' ? lp.description : null,
      image: typeof lp.image === 'string' ? lp.image : null,
      url: typeof lp.url === 'string' ? lp.url : '',
      siteName: typeof lp.siteName === 'string' ? lp.siteName : null,
    };
  }
  return {
    id: s.id,
    authorId: s.authorId,
    kind,
    textContent: s.textContent,
    mediaUrl: s.mediaUrl,
    linkUrl: s.linkUrl,
    linkPreview,
    backgroundColor: coerceBgKey(s.backgroundColor),
    textColor: coerceTextColor(s.textColor),
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
    viewed: viewerId ? s.views.some((v) => v.viewerId === viewerId) : false,
    viewCount: s._count.views,
    author: {
      id: s.author.id,
      username: s.author.username,
      name: s.author.name,
      avatarGradient: s.author.avatarGradient,
      initials: s.author.initials,
      avatarUrl: s.author.avatarUrl,
    },
  };
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Sign in to view your archive.' }, { status: 401 });
    }

    // Archived stories from the retention window. Includes both naturally
    // archived (24h elapsed) and explicitly deleted (creator DELETE) — both
    // have archivedAt set.
    const cutoff = new Date(Date.now() - STORY_ARCHIVE_RETENTION_MS);
    const stories = (await db.userStory.findMany({
      where: {
        authorId: currentUser.id,
        archivedAt: { not: null, gte: cutoff },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarGradient: true,
            initials: true,
            avatarUrl: true,
            suspended: true,
          },
        },
        views: { where: { viewerId: currentUser.id }, select: { viewerId: true } },
        _count: { select: { views: true } },
      },
      orderBy: { archivedAt: 'desc' },
      take: 100,
    })) as unknown as RawStoryRow[];

    return NextResponse.json({
      stories: stories.map((s) => toStoryDTO(s, currentUser.id)),
      retentionDays: 7,
    });
  } catch (error) {
    console.error('User story archive error:', error);
    return NextResponse.json({ error: 'Failed to fetch archive.' }, { status: 500 });
  }
}
