import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// GET    /api/comics/bookmarks — list user's bookmarked stories
// POST   /api/comics/bookmarks — bookmark a story { storyId }
// DELETE /api/comics/bookmarks?storyId=... — remove bookmark

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to view bookmarks.' }, { status: 401 });

    const bookmarks = await db.comicBookmark.findMany({
      where: { userId: user.id },
      include: {
        story: {
          select: { id: true, title: true, coverImagePath: true, testament: true, category: true, bibleBook: true, bibleChapter: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error('Comic bookmarks error:', error);
    return NextResponse.json({ error: 'Failed to load bookmarks.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to bookmark.' }, { status: 401 });

    const { storyId } = await request.json();
    if (!storyId) return NextResponse.json({ error: 'Missing storyId.' }, { status: 400 });

    await db.comicBookmark.upsert({
      where: { userId_storyId: { userId: user.id, storyId } },
      update: {},
      create: { userId: user.id, storyId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Comic bookmark error:', error);
    return NextResponse.json({ error: 'Failed to bookmark.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId) return NextResponse.json({ error: 'Missing storyId.' }, { status: 400 });

    await db.comicBookmark.deleteMany({ where: { userId: user.id, storyId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Comic bookmark delete error:', error);
    return NextResponse.json({ error: 'Failed to remove bookmark.' }, { status: 500 });
  }
}
