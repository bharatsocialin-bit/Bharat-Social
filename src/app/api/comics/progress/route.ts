import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// POST /api/comics/progress — save reading progress { storyId, lastPageRead }
// GET  /api/comics/progress — list all progress for the user

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in.' }, { status: 401 });

    const progress = await db.comicReadingProgress.findMany({
      where: { userId: user.id },
      include: {
        story: { select: { id: true, title: true, coverImagePath: true } },
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Comic progress error:', error);
    return NextResponse.json({ error: 'Failed to load progress.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in.' }, { status: 401 });

    const { storyId, lastPageRead } = await request.json();
    if (!storyId || typeof lastPageRead !== 'number') {
      return NextResponse.json({ error: 'Missing storyId or lastPageRead.' }, { status: 400 });
    }

    await db.comicReadingProgress.upsert({
      where: { userId_storyId: { userId: user.id, storyId } },
      update: { lastPageRead },
      create: { userId: user.id, storyId, lastPageRead },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Comic progress save error:', error);
    return NextResponse.json({ error: 'Failed to save progress.' }, { status: 500 });
  }
}
