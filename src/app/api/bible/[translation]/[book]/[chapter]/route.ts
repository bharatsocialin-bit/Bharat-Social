import { NextResponse } from 'next/server';
import { fetchChapter } from '@/lib/bible/client';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { db } from '@/lib/db';
import { recordReadingDay } from '@/lib/bible/streak';

// GET /api/bible/[translation]/[book]/[chapter]
//
// Fetches a Bible chapter from the upstream API (bolls.life or bible-api.com)
// and returns the verse text. Public — anyone can read the Bible without
// signing in.
//
// Side effect: if the user is signed in, records a "reading day" for the
// streak counter. This is fire-and-forget — never blocks the response.
//
// Path params:
//   translation  — e.g. "KJV", "WEB", "IRVHin"
//   book         — USFM ID, e.g. "GEN", "JHN"
//   chapter      — 1-based chapter number
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ translation: string; book: string; chapter: string }> },
) {
  try {
    const { translation, book, chapter: chapterStr } = await params;
    const chapter = parseInt(chapterStr, 10);
    if (!Number.isFinite(chapter) || chapter < 1) {
      return NextResponse.json({ error: 'Invalid chapter number.' }, { status: 400 });
    }

    const data = await fetchChapter(translation, book.toUpperCase(), chapter);
    if (!data) {
      return NextResponse.json(
        { error: 'Chapter not found. The translation or book/chapter may not be available.' },
        { status: 404 },
      );
    }

    // Fire-and-forget: record a reading day for the streak counter (auth only).
    // Errors are swallowed — never block the Bible read on streak tracking.
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          await recordReadingDay(user.id);
        }
      } catch {
        // Non-fatal.
      }
    })();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Bible chapter fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch Bible chapter.' }, { status: 500 });
  }
}
