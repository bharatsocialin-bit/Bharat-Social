import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ============================================================================
// GET    /api/bible/bookmarks           — list current user's bookmarks
// POST   /api/bible/bookmarks           — create a bookmark
// DELETE /api/bible/bookmarks?id=...    — delete a bookmark by ID
//
// All routes require authentication. Anonymous users get 401.
// ============================================================================

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view bookmarks.' }, { status: 401 });
    }
    const bookmarks = await db.bibleBookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error('Bible bookmarks list error:', error);
    return NextResponse.json({ error: 'Failed to load bookmarks.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to bookmark verses.' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const translation = typeof body.translation === 'string' ? body.translation : '';
    const book = typeof body.book === 'string' ? body.book.toUpperCase() : '';
    const bookName = typeof body.bookName === 'string' ? body.bookName : '';
    const chapter = typeof body.chapter === 'number' ? body.chapter : parseInt(String(body.chapter), 10);
    const verse = typeof body.verse === 'number' ? body.verse : parseInt(String(body.verse), 10);
    const verseText = typeof body.verseText === 'string' ? body.verseText : '';
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null;

    if (!translation || !book || !bookName || !Number.isFinite(chapter) || !Number.isFinite(verse) || !verseText) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (chapter < 1 || chapter > 200 || verse < 1 || verse > 200) {
      return NextResponse.json({ error: 'Invalid chapter or verse number.' }, { status: 400 });
    }

    // Upsert — if the bookmark already exists (same user + translation + book
    // + chapter + verse), update the note + verseText. Otherwise create.
    const bookmark = await db.bibleBookmark.upsert({
      where: {
        userId_translation_book_chapter_verse: {
          userId: user.id,
          translation,
          book,
          chapter,
          verse,
        },
      },
      update: { note, verseText },
      create: {
        userId: user.id,
        translation,
        book,
        bookName,
        chapter,
        verse,
        verseText,
        note,
      },
    });

    return NextResponse.json({ bookmark });
  } catch (error) {
    console.error('Bible bookmark create error:', error);
    return NextResponse.json({ error: 'Failed to save bookmark.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to manage bookmarks.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing bookmark id.' }, { status: 400 });
    }

    // Ensure the bookmark belongs to the current user before deleting.
    const existing = await db.bibleBookmark.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Bookmark not found.' }, { status: 404 });
    }

    await db.bibleBookmark.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Bible bookmark delete error:', error);
    return NextResponse.json({ error: 'Failed to delete bookmark.' }, { status: 500 });
  }
}
