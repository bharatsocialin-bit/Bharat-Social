import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ============================================================================
// GET /api/bible/history — list the user's reading history (most recent first)
//
// Returns chapters the user has opened, newest first. Used for:
//   • "Continue Reading" on the Bible home
//   • Reading history list
//
// Auth required.
// ============================================================================

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view history.' }, { status: 401 });
    }

    const history = await db.bibleReadingHistory.findMany({
      where: { userId: user.id },
      orderBy: { readAt: 'desc' },
      take: 50, // Last 50 chapters read
    });

    return NextResponse.json({
      history: history.map((h) => ({
        id: h.id,
        translation: h.translation,
        book: h.book,
        bookName: h.bookName,
        chapter: h.chapter,
        readAt: h.readAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Bible history error:', error);
    return NextResponse.json({ error: 'Failed to load history.' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/bible/history — record that the user opened a chapter
// (called automatically by the chapter fetch API; this route is for manual
// recording or re-recording)
// ============================================================================

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to track reading.' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const translation = typeof body.translation === 'string' ? body.translation : '';
    const book = typeof body.book === 'string' ? body.book.toUpperCase() : '';
    const bookName = typeof body.bookName === 'string' ? body.bookName : '';
    const chapter = typeof body.chapter === 'number' ? body.chapter : parseInt(String(body.chapter), 10);

    if (!translation || !book || !bookName || !Number.isFinite(chapter)) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Upsert — if the user already read this chapter, update the readAt timestamp.
    const entry = await db.bibleReadingHistory.upsert({
      where: {
        userId_translation_book_chapter: {
          userId: user.id,
          translation,
          book,
          chapter,
        },
      },
      update: { readAt: new Date() },
      create: {
        userId: user.id,
        translation,
        book,
        bookName,
        chapter,
      },
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error('Bible history record error:', error);
    return NextResponse.json({ error: 'Failed to record history.' }, { status: 500 });
  }
}
