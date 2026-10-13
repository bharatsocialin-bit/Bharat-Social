import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { safeParsePostIds } from '@/lib/parse';

// GET /api/pulse/stories/[id] — get a single story with related posts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const story = await db.pulseStory.findUnique({ where: { id } });
    if (!story) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    // Get related posts
    const postIds = safeParsePostIds(story.postIds);
    let relatedPosts: unknown[] = [];
    if (postIds.length > 0) {
      const posts = await db.post.findMany({
        where: { id: { in: postIds }, deletedAt: null },
        include: {
          author: {
            select: {
              id: true, name: true, username: true,
              avatarGradient: true, initials: true,
            },
          },
          likes: { select: { userId: true } },
          comments: { select: { id: true } },
          _count: { select: { reposts: true } },
        },
      });

      relatedPosts = posts.map((p) => ({
        id: p.id,
        authorId: p.authorId,
        content: p.content,
        language: p.language,
        createdAt: p.createdAt.toISOString(),
        author: {
          id: p.author.id,
          name: p.author.name || p.author.username,
          handle: p.author.username,
          initials: p.author.initials,
          avatarGradient: p.author.avatarGradient,
        },
        likes: p.likes.length,
        reposts: p._count.reposts,
        comments: p.comments.length,
      }));
    }

    return NextResponse.json({
      story: {
        id: story.id,
        title: story.title,
        summary: story.summary,
        region: story.region,
        language: story.language,
        status: story.status,
        evidenceSource: story.evidenceSource,
        evidenceNote: story.evidenceNote,
        postIds: safeParsePostIds(story.postIds),
        createdAt: story.createdAt.toISOString(),
        updatedAt: story.updatedAt.toISOString(),
      },
      relatedPosts,
    });
  } catch (error) {
    console.error('Story detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch story.' }, { status: 500 });
  }
}
