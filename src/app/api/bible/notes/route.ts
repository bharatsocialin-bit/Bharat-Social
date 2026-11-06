import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ============================================================================
// GET    /api/bible/notes                     — list current user's notes
// GET    /api/bible/notes?book=GEN&chapter=1  — get note for a specific verse
// POST   /api/bible/notes                     — create or update a note
// DELETE /api/bible/notes?id=...              — delete a note
// ============================================================================

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to view notes.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const book = searchParams.get('book')?.toUpperCase();
    const chapter = searchParams.get('chapter');
    const verse = searchParams.get('verse');
    const translation = searchParams.get('translation');

    // If book+chapter+verse+translation are provided, get a single note.
    if (book && chapter && verse && translation) {
      const note = await db.bibleNote.findUnique({
        where: {
          userId_translation_book_chapter_verse: {
            userId: user.id,
            translation,
            book,
            chapter: parseInt(chapter, 10),
            verse: parseInt(verse, 10),
          },
        },
      });
      return NextResponse.json({ note });
    }

    // Otherwise list all notes.
    const notes = await db.bibleNote.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Bible notes list error:', error);
    return NextResponse.json({ error: 'Failed to load notes.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to create notes.' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const translation = typeof body.translation === 'string' ? body.translation : '';
    const book = typeof body.book === 'string' ? body.book.toUpperCase() : '';
    const bookName = typeof body.bookName === 'string' ? body.bookName : '';
    const chapter = typeof body.chapter === 'number' ? body.chapter : parseInt(String(body.chapter), 10);
    const verse = typeof body.verse === 'number' ? body.verse : parseInt(String(body.verse), 10);
    const content = typeof body.content === 'string' ? body.content.slice(0, 2000) : '';

    if (!translation || !book || !bookName || !Number.isFinite(chapter) || !Number.isFinite(verse)) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const note = await db.bibleNote.upsert({
      where: {
        userId_translation_book_chapter_verse: {
          userId: user.id,
          translation,
          book,
          chapter,
          verse,
        },
      },
      update: { content },
      create: {
        userId: user.id,
        translation,
        book,
        bookName,
        chapter,
        verse,
        content,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Bible note create error:', error);
    return NextResponse.json({ error: 'Failed to save note.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to delete notes.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing note id.' }, { status: 400 });
    }

    const existing = await db.bibleNote.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
    }

    await db.bibleNote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Bible note delete error:', error);
    return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
  }
}
