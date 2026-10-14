import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import {
  coerceBgKey,
  coerceTextColor,
  isStoryKind,
  type StoryDTO,
  type StoryKind,
  type StoryLinkPreview,
} from '@/lib/pulse/user-stories';
import {
  deleteStoryMedia,
  storyObjectPathFromPublicUrl,
} from '@/lib/supabase/story-storage';
import {
  getStorageAdminClient,
  getStashedSupabaseTokens,
  getUserTokenClientIfNeeded,
  refreshSupabaseAccessToken,
} from '@/lib/supabase/storage';
import { getSupabaseRouteClient } from '@/lib/supabase/route-client';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// GET    /api/pulse/stories/user/[id]  — fetch a single story (public)
// DELETE /api/pulse/stories/user/[id]  — delete own story (creator only)
//
// Deleting soft-archives the story (sets archivedAt = now, deletedAt = now)
// and best-effort removes the storage object. The DB row is purged by the
// 7-day archive sweep later.
// ============================================================================

interface RawStoryRow {
  id: string;
  authorId: string;
  kind: string;
  textContent: string | null;
  mediaUrl: string | null;
  mediaObjectPath: string | null;
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

/** Resolve a storage client for cleanup. Best-effort; returns null if none. */
async function resolveCleanupClient(
  user: { id: string; supabaseUserId: string | null },
): Promise<{ client: SupabaseClient } | null> {
  const admin = getStorageAdminClient();
  if (admin) return { client: admin };
  const routeClient = await getSupabaseRouteClient();
  if (routeClient) {
    const { data, error } = await routeClient.auth.getUser();
    if (!error && data.user) return { client: routeClient };
  }
  const stashed = await getStashedSupabaseTokens(async () => (await cookies()).toString());
  if (stashed && user.supabaseUserId) {
    let client = getUserTokenClientIfNeeded(stashed.accessToken);
    if (client) return { client };
    const fresh = await refreshSupabaseAccessToken(stashed.refreshToken);
    if (fresh) {
      client = getUserTokenClientIfNeeded(fresh);
      if (client) return { client };
    }
  }
  return null;
}

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing story id.' }, { status: 400 });
    }
    const currentUser = await getCurrentUser();

    const story = (await db.userStory.findUnique({
      where: { id },
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
        views: currentUser
          ? { where: { viewerId: currentUser.id }, select: { viewerId: true } }
          : false,
        _count: { select: { views: true } },
      },
    })) as unknown as RawStoryRow | null;

    if (!story || story.deletedAt || story.archivedAt || story.author.suspended) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }
    // Live window check.
    if (story.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Story has expired.' }, { status: 410 });
    }
    return NextResponse.json({
      story: toStoryDTO(story, currentUser?.id ?? null),
    });
  } catch (error) {
    console.error('User story get error:', error);
    return NextResponse.json({ error: 'Failed to fetch story.' }, { status: 500 });
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing story id.' }, { status: 400 });
    }
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Sign in to delete a story.' }, { status: 401 });
    }

    const story = (await db.userStory.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        mediaUrl: true,
        mediaObjectPath: true,
        deletedAt: true,
        archivedAt: true,
      },
    })) as unknown as {
      id: string;
      authorId: string;
      mediaUrl: string | null;
      mediaObjectPath: string | null;
      deletedAt: Date | null;
      archivedAt: Date | null;
    } | null;

    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }
    if (story.authorId !== currentUser.id) {
      return NextResponse.json(
        { error: 'You can only delete your own stories.' },
        { status: 403 },
      );
    }
    if (story.deletedAt) {
      // Already deleted — idempotent success.
      return NextResponse.json({ ok: true, alreadyDeleted: true });
    }

    // Soft-delete the DB row.
    const now = new Date();
    await db.userStory.update({
      where: { id: story.id },
      data: { deletedAt: now, archivedAt: story.archivedAt ?? now },
    });

    // Best-effort storage cleanup.
    const objectPath =
      story.mediaObjectPath ?? storyObjectPathFromPublicUrl(story.mediaUrl);
    if (objectPath) {
      const resolved = await resolveCleanupClient({
        id: currentUser.id,
        supabaseUserId: currentUser.supabaseUserId,
      });
      if (resolved) {
        await deleteStoryMedia(resolved.client, objectPath);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('User story delete error:', error);
    return NextResponse.json({ error: 'Failed to delete story.' }, { status: 500 });
  }
}
