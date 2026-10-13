import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET /api/pulse/trending — trending topics from actual platform activity
// Ranking method: posts from the last 7 days, scored by:
//   score = (likes * 3) + (comments * 2) + (reposts * 2) + recency_bonus
// recency_bonus = max(0, 10 - days_old) — newer posts get a small boost
// Each unique word in post content (length > 3 chars) is a "topic"
// Max 1 topic per post to prevent one post from dominating
// Time window: last 7 days
// Excludes: soft-deleted posts, blocked users' posts, suspended users' posts
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // Get IDs of blocked users (to exclude their posts)
    let blockedUserIds: string[] = [];
    if (currentUser) {
      const blocks = await db.block.findMany({
        where: { blockerId: currentUser.id },
        select: { blockedId: true },
      });
      blockedUserIds = blocks.map((b) => b.blockedId);
    }

    // Get posts from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const posts = await db.post.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: sevenDaysAgo },
        ...(blockedUserIds.length > 0
          ? { authorId: { notIn: blockedUserIds } }
          : {}),
      },
      include: {
        likes: { select: { userId: true } },
        comments: { select: { id: true } },
        _count: { select: { reposts: true } },
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarGradient: true,
            initials: true,
            suspended: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 posts for ranking
    });

    // Filter out posts from suspended users
    const activePosts = posts.filter((p) => !p.author.suspended);

    // Calculate trending topics from post content
    const topicMap = new Map<string, { score: number; postCount: number; topPostId: string; topScore: number }>();

    for (const post of activePosts) {
      const likes = post.likes.length;
      const comments = post.comments.length;
      const reposts = post._count.reposts;

      const daysOld = Math.floor((Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const recencyBonus = Math.max(0, 10 - daysOld);
      const score = likes * 3 + comments * 2 + reposts * 2 + recencyBonus;

      // Extract significant words from content (length > 4, lowercase)
      const words = post.content
        .toLowerCase()
        .replace(/[^\w\s#]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 4 && !['about', 'after', 'again', 'being', 'could', 'every', 'first', 'great', 'have', 'their', 'there', 'these', 'those', 'would', 'yourself'].includes(w));

      // Only take the first significant word per post (prevents one post dominating)
      const topic = words[0];
      if (!topic) continue;

      const existing = topicMap.get(topic);
      if (!existing) {
        topicMap.set(topic, { score, postCount: 1, topPostId: post.id, topScore: score });
      } else {
        existing.score += score;
        existing.postCount += 1;
        if (score > existing.topScore) {
          existing.topScore = score;
          existing.topPostId = post.id;
        }
      }
    }

    // Sort by score and take top 10
    const trending = Array.from(topicMap.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 10)
      .map(([topic, data]) => ({
        topic,
        score: data.score,
        postCount: data.postCount,
        topPostId: data.topPostId,
      }));

    return NextResponse.json({
      trending,
      method: 'Posts from last 7 days, scored by likes(×3) + comments(×2) + reposts(×2) + recency bonus. Each unique word (4+ chars) is a topic, limited to 1 topic per post.',
      timeWindow: '7 days',
      totalPostsAnalyzed: activePosts.length,
    });
  } catch (error) {
    console.error('Trending error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending topics.' }, { status: 500 });
  }
}
