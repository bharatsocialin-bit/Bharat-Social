import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import {
  STORY_LIVE_MS,
  STORY_BG_PALETTE,
  coerceBgKey,
  coerceTextColor,
  isStoryKind,
  validateStoryLinkUrl,
  validateStoryText,
  type StoryBgKey,
  type StoryDTO,
  type StoryGroupDTO,
  type StoryKind,
  type StoryLinkPreview,
} from '@/lib/pulse/user-stories';
import { fetchLinkPreview } from '@/lib/pulse/link-preview';
import {
  resolveStoryStorage,
  refreshStoryStorageClient,
} from '@/lib/pulse/story-storage-resolver';
import {
  STORY_IMAGE_MAX_BYTES,
  STORY_VIDEO_MAX_BYTES,
  ALLOWED_STORY_IMAGE_MIMES,
  ALLOWED_STORY_VIDEO_MIMES,
  detectStoryImageMime,
  detectStoryVideoMime,
  uploadStoryMediaAsAdmin,
  uploadStoryMediaAsUser,
  type AllowedStoryImageMime,
  type AllowedStoryVideoMime,
} from '@/lib/supabase/story-storage';

// ============================================================================
// GET  /api/pulse/stories/user           — list live story GROUPS (rail UI)
// POST /api/pulse/stories/user           — create a new story
//
// STORY VISIBILITY
//   Public: anyone (including anonymous visitors) can read live stories.
//   Live stories: expiresAt > now AND archivedAt IS NULL AND deletedAt IS NULL.
//
// GROUPING
//   The rail UI shows one avatar per author. Stories by the requesting user
//   (if any) are returned first with isOwn=true; other authors follow
//   ordered by their most recent story's createdAt.
// ============================================================================

// ── helpers ────────────────────────────────────────────────────────────────

interface AuthorRow {
  id: string;
  username: string;
  name: string | null;
  avatarGradient: string;
  initials: string;
  avatarUrl: string | null;
  suspended: boolean;
}

function toAuthorDTO(a: AuthorRow) {
  return {
    id: a.id,
    username: a.username,
    name: a.name,
    avatarGradient: a.avatarGradient,
    initials: a.initials,
    avatarUrl: a.avatarUrl,
  };
}

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
  views: Array<{ viewerId: string }>;
  _count: { views: number };
  author: AuthorRow;
}

function toStoryDTO(s: RawStoryRow, viewerId: string | null): StoryDTO {
  // Validate kind/bg/color before casting.
  const kind: StoryKind = isStoryKind(s.kind) ? s.kind : 'text';
  const bg: StoryBgKey = coerceBgKey(s.backgroundColor);
  const textColor = coerceTextColor(s.textColor);
  // linkPreview is stored as Json — coerce defensively.
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
  const viewed = viewerId
    ? s.views.some((v) => v.viewerId === viewerId)
    : false;
  return {
    id: s.id,
    authorId: s.authorId,
    kind,
    textContent: s.textContent,
    mediaUrl: s.mediaUrl,
    linkUrl: s.linkUrl,
    linkPreview,
    backgroundColor: bg,
    textColor,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
    viewed,
    viewCount: s._count.views,
    author: toAuthorDTO(s.author),
  };
}

/** Side-effecting sweep: archive stories whose 24h window has elapsed.
 *  Returns the number of rows archived. Safe to call on every read. */
async function archiveExpiredStories(): Promise<number> {
  const now = new Date();
  try {
    const r = await db.userStory.updateMany({
      where: {
        archivedAt: null,
        deletedAt: null,
        expiresAt: { lte: now },
      },
      data: { archivedAt: now },
    });
    return r.count;
  } catch (error) {
    console.error('archiveExpiredStories failed (non-fatal):', error);
    return 0;
  }
}

/** Best-effort hard-delete of archived stories older than the retention window. */
async function purgeOldArchivedStories(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    // Two-step: select then delete (so we can also queue storage cleanup
    // in a future iteration). For now, hard-delete the DB rows.
    const r = await db.userStory.deleteMany({
      where: {
        archivedAt: { not: null, lt: cutoff },
      },
    });
    return r.count;
  } catch (error) {
    console.error('purgeOldArchivedStories failed (non-fatal):', error);
    return 0;
  }
}

// ── GET: list live story groups ────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === '1';

    // Side-effecting sweeps — cheap and idempotent.
    await archiveExpiredStories();
    if (Math.random() < 0.1) {
      // Throttle the purge to ~10% of reads to avoid hammering the DB.
      await purgeOldArchivedStories();
    }

    const currentUser = await getCurrentUser();

    const where = includeArchived
      ? { deletedAt: null, archivedAt: null }
      : { deletedAt: null, archivedAt: null, expiresAt: { gt: new Date() } };

    // Only fetch stories from non-suspended authors.
    const stories = (await db.userStory.findMany({
      where,
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
        views: currentUser ? { where: { viewerId: currentUser.id }, select: { viewerId: true } } : false,
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // safety ceiling
    })) as unknown as RawStoryRow[];

    // Filter out stories from suspended users (defensive — author lookup
    // already filters, but a user could be suspended between query and now).
    const visible = stories.filter((s) => !s.author.suspended);

    // Group by author, preserving newest-first order.
    const groupsMap = new Map<string, StoryDTO[]>();
    for (const s of visible) {
      const arr = groupsMap.get(s.authorId) ?? [];
      arr.push(toStoryDTO(s, currentUser?.id ?? null));
      groupsMap.set(s.authorId, arr);
    }

    const groups: StoryGroupDTO[] = [];
    // Own group first (if any).
    if (currentUser) {
      const own = groupsMap.get(currentUser.id);
      if (own && own.length > 0) {
        groups.push({
          author: own[0].author,
          stories: own,
          isOwn: true,
          allViewed: own.every((s) => s.viewed),
        });
        groupsMap.delete(currentUser.id);
      }
    }
    // Remaining groups in newest-first order (already sorted because we
    // iterated stories in createdAt desc order).
    for (const arr of groupsMap.values()) {
      if (arr.length === 0) continue;
      groups.push({
        author: arr[0].author,
        stories: arr,
        isOwn: false,
        allViewed: arr.every((s) => s.viewed),
      });
    }

    return NextResponse.json({
      groups,
      totalStories: groups.reduce((n, g) => n + g.stories.length, 0),
      totalAuthors: groups.length,
    });
  } catch (error) {
    console.error('User stories list error:', error);
    return NextResponse.json({ error: 'Failed to fetch stories.' }, { status: 500 });
  }
}

// ── POST: create a new story ───────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Sign in to post a story.' }, { status: 401 });
    }
    if (currentUser.suspended) {
      return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
    }

    // ── Parse request ──
    // Accept either JSON (text/link kinds) or multipart (photo/video kinds).
    const contentType = request.headers.get('content-type') ?? '';
    let kind: unknown;
    let textContent: string | null = null;
    let linkUrl: string | null = null;
    let bgColorRaw: unknown = 'saffron';
    let textColorRaw: unknown = 'white';
    let photoFile: File | null = null;
    let videoFile: File | null = null;
    let captionRaw: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return NextResponse.json({ error: 'Invalid form upload.' }, { status: 400 });
      }
      kind = form.get('kind');
      const t = form.get('textContent');
      textContent = typeof t === 'string' ? t : null;
      const c = form.get('caption');
      captionRaw = typeof c === 'string' ? c : null;
      const u = form.get('linkUrl');
      linkUrl = typeof u === 'string' ? u : null;
      const bg = form.get('backgroundColor');
      bgColorRaw = typeof bg === 'string' ? bg : 'saffron';
      const tc = form.get('textColor');
      textColorRaw = typeof tc === 'string' ? tc : 'white';
      const pf = form.get('photo');
      if (pf instanceof File) photoFile = pf;
      const vf = form.get('video');
      if (vf instanceof File) videoFile = vf;
    } else if (contentType.includes('application/json')) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
      }
      const b = body as Record<string, unknown>;
      kind = b.kind;
      textContent = typeof b.textContent === 'string' ? b.textContent : null;
      captionRaw = typeof b.caption === 'string' ? b.caption : null;
      linkUrl = typeof b.linkUrl === 'string' ? b.linkUrl : null;
      bgColorRaw = b.backgroundColor ?? 'saffron';
      textColorRaw = b.textColor ?? 'white';
    } else {
      return NextResponse.json(
        { error: 'Unsupported content-type. Use JSON or multipart/form-data.' },
        { status: 415 },
      );
    }

    if (!isStoryKind(kind)) {
      return NextResponse.json(
        { error: 'Invalid story kind. Must be one of: text, photo, video, link.' },
        { status: 400 },
      );
    }

    const bgColor = coerceBgKey(bgColorRaw);
    const textColor = coerceTextColor(textColorRaw);

    // ── Per-kind validation ──
    let mediaUrl: string | null = null;
    let mediaObjectPath: string | null = null;
    let linkPreview: StoryLinkPreview | null = null;

    if (kind === 'text') {
      const t = validateStoryText(textContent);
      if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });
      textContent = t.value;
    } else if (kind === 'link') {
      const u = validateStoryLinkUrl(linkUrl);
      if (!u.ok) return NextResponse.json({ error: u.error }, { status: 400 });
      linkUrl = u.value;
      // Optional author note.
      if (captionRaw) {
        const c = validateStoryText(captionRaw);
        if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
        textContent = c.value;
      } else {
        textContent = null;
      }
      // Fetch OG preview (server-side only; never throws).
      linkPreview = await fetchLinkPreview(linkUrl);
    } else if (kind === 'photo') {
      if (!photoFile) {
        return NextResponse.json(
          { error: 'A photo file is required for kind=photo.' },
          { status: 400 },
        );
      }
      if (photoFile.size > STORY_IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { error: 'Photo is too large. Maximum size is 10 MB.' },
          { status: 413 },
        );
      }
      if (photoFile.size === 0) {
        return NextResponse.json({ error: 'The selected photo is empty.' }, { status: 400 });
      }
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const mime = detectStoryImageMime(buffer);
      if (!mime) {
        return NextResponse.json(
          { error: 'Unsupported photo format. Use JPEG, PNG, or WebP.' },
          { status: 415 },
        );
      }
      // Optional caption.
      if (captionRaw) {
        const c = validateStoryText(captionRaw);
        if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
        textContent = c.value;
      } else {
        textContent = null;
      }
      // Upload.
      const resolved = await resolveStoryStorage({
        id: currentUser.id,
        supabaseUserId: currentUser.supabaseUserId,
      });
      if ('error' in resolved) {
        return NextResponse.json(
          { error: resolved.error, setupRequired: resolved.setup ?? false },
          { status: resolved.status },
        );
      }
      try {
        const stored = resolved.storage.isAdmin
          ? await uploadStoryMediaAsAdmin(
              resolved.storage.client,
              resolved.storage.folderOwnerId,
              buffer,
              mime,
              'photo',
            )
          : await uploadStoryMediaAsUser(
              resolved.storage.client,
              resolved.storage.folderOwnerId,
              buffer,
              mime,
              'photo',
            );
        mediaUrl = stored.publicUrl;
        mediaObjectPath = stored.objectPath;
      } catch (err) {
        // Retry once with a refreshed token (Path 3 only).
        if (!resolved.storage.isAdmin) {
          const refreshed = await refreshStoryStorageClient({
            id: currentUser.id,
            supabaseUserId: currentUser.supabaseUserId,
          });
          if (refreshed) {
            try {
              const stored = await uploadStoryMediaAsUser(
                refreshed.client,
                refreshed.folderOwnerId,
                buffer,
                mime as AllowedStoryImageMime,
                'photo',
              );
              mediaUrl = stored.publicUrl;
              mediaObjectPath = stored.objectPath;
            } catch (retryErr) {
              console.error('Story photo upload retry failed:', retryErr);
              return NextResponse.json(
                { error: 'Failed to upload photo. Please try again.' },
                { status: 500 },
              );
            }
          } else {
            console.error('Story photo upload failed:', err);
            return NextResponse.json(
              { error: 'Failed to upload photo. Please try again.' },
              { status: 500 },
            );
          }
        } else {
          console.error('Story photo upload failed:', err);
          return NextResponse.json(
            { error: 'Failed to upload photo. Please try again.' },
            { status: 500 },
          );
        }
      }
    } else if (kind === 'video') {
      if (!videoFile) {
        return NextResponse.json(
          { error: 'A video file is required for kind=video.' },
          { status: 400 },
        );
      }
      if (videoFile.size > STORY_VIDEO_MAX_BYTES) {
        return NextResponse.json(
          { error: 'Video is too large. Maximum size is 50 MB.' },
          { status: 413 },
        );
      }
      if (videoFile.size === 0) {
        return NextResponse.json({ error: 'The selected video is empty.' }, { status: 400 });
      }
      const buffer = Buffer.from(await videoFile.arrayBuffer());
      const declaredMime = videoFile.type || null;
      const mime = detectStoryVideoMime(buffer, declaredMime);
      if (!mime) {
        return NextResponse.json(
          { error: 'Unsupported video format. Use MP4, WebM, or MOV.' },
          { status: 415 },
        );
      }
      // Optional caption.
      if (captionRaw) {
        const c = validateStoryText(captionRaw);
        if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });
        textContent = c.value;
      } else {
        textContent = null;
      }
      // Upload.
      const resolved = await resolveStoryStorage({
        id: currentUser.id,
        supabaseUserId: currentUser.supabaseUserId,
      });
      if ('error' in resolved) {
        return NextResponse.json(
          { error: resolved.error, setupRequired: resolved.setup ?? false },
          { status: resolved.status },
        );
      }
      try {
        const stored = resolved.storage.isAdmin
          ? await uploadStoryMediaAsAdmin(
              resolved.storage.client,
              resolved.storage.folderOwnerId,
              buffer,
              mime,
              'video',
            )
          : await uploadStoryMediaAsUser(
              resolved.storage.client,
              resolved.storage.folderOwnerId,
              buffer,
              mime,
              'video',
            );
        mediaUrl = stored.publicUrl;
        mediaObjectPath = stored.objectPath;
      } catch (err) {
        if (!resolved.storage.isAdmin) {
          const refreshed = await refreshStoryStorageClient({
            id: currentUser.id,
            supabaseUserId: currentUser.supabaseUserId,
          });
          if (refreshed) {
            try {
              const stored = await uploadStoryMediaAsUser(
                refreshed.client,
                refreshed.folderOwnerId,
                buffer,
                mime as AllowedStoryVideoMime,
                'video',
              );
              mediaUrl = stored.publicUrl;
              mediaObjectPath = stored.objectPath;
            } catch (retryErr) {
              console.error('Story video upload retry failed:', retryErr);
              return NextResponse.json(
                { error: 'Failed to upload video. Please try again.' },
                { status: 500 },
              );
            }
          } else {
            console.error('Story video upload failed:', err);
            return NextResponse.json(
              { error: 'Failed to upload video. Please try again.' },
              { status: 500 },
            );
          }
        } else {
          console.error('Story video upload failed:', err);
          return NextResponse.json(
            { error: 'Failed to upload video. Please try again.' },
            { status: 500 },
          );
        }
      }
    }

    // ── Insert the story row ──
    const now = new Date();
    const expiresAt = new Date(now.getTime() + STORY_LIVE_MS);

    const created = await db.userStory.create({
      data: {
        authorId: currentUser.id,
        kind,
        textContent,
        mediaUrl,
        mediaObjectPath,
        linkUrl,
        linkPreview: linkPreview as never, // Prisma Json field
        backgroundColor: bgColor,
        textColor,
        expiresAt,
        archivedAt: null,
        deletedAt: null,
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
    });

    return NextResponse.json({
      story: toStoryDTO(created as unknown as RawStoryRow, currentUser.id),
    });
  } catch (error) {
    console.error('User story create error:', error);
    return NextResponse.json({ error: 'Failed to create story.' }, { status: 500 });
  }
}

// Re-export palette for clients that want it.
export { STORY_BG_PALETTE };
