import { NextResponse } from 'next/server';
import { fetchChapterFromYouVersion } from '@/lib/bible/youversion-client';
import { fetchChapterFromHelloao } from '@/lib/bible/helloao-client';
import { getBook } from '@/lib/bible/books';

// ============================================================================
// GET /api/bible/votd — Verse of the Day
//
// Returns a different verse every day, deterministically selected from a
// curated list of well-known verses. The verse is fetched live from
// YouVersion or helloao.org and returned with full text.
//
// Public (no auth required) — anyone can see the Verse of the Day.
// ============================================================================

// Curated list of impactful verses — cycles through these daily.
const VOTD_LIST: Array<{ book: string; chapter: number; verse: number }> = [
  { book: 'JHN', chapter: 3, verse: 16 },
  { book: 'PSA', chapter: 23, verse: 1 },
  { book: 'PRO', chapter: 3, verse: 5 },
  { book: 'PHI', chapter: 4, verse: 13 },
  { book: 'JER', chapter: 29, verse: 11 },
  { book: 'ROM', chapter: 8, verse: 28 },
  { book: 'ISA', chapter: 41, verse: 10 },
  { book: 'PSA', chapter: 46, verse: 1 },
  { book: '1CO', chapter: 13, verse: 4 },
  { book: 'JOS', chapter: 1, verse: 9 },
  { book: 'MAT', chapter: 6, verse: 33 },
  { book: '2CO', chapter: 5, verse: 17 },
  { book: 'PHP', chapter: 4, verse: 6 },
  { book: 'ISA', chapter: 40, verse: 31 },
  { book: '1JN', chapter: 4, verse: 7 },
  { book: 'PSA', chapter: 119, verse: 105 },
  { book: 'PRO', chapter: 16, verse: 3 },
  { book: 'MAT', chapter: 11, verse: 28 },
  { book: 'ROM', chapter: 12, verse: 2 },
  { book: 'GAL', chapter: 5, verse: 22 },
  { book: 'EPH', chapter: 2, verse: 8 },
  { book: 'HEB', chapter: 11, verse: 1 },
  { book: 'JAS', chapter: 1, verse: 5 },
  { book: '1PE', chapter: 5, verse: 7 },
  { book: 'REV', chapter: 3, verse: 20 },
  { book: 'PSA', chapter: 1, verse: 1 },
  { book: 'PRO', chapter: 1, verse: 7 },
  { book: 'MIC', chapter: 6, verse: 8 },
  { book: 'JHN', chapter: 14, verse: 6 },
  { book: 'ACT', chapter: 1, verse: 8 },
  { book: '2TI', chapter: 1, verse: 7 },
];

export async function GET() {
  try {
    // Pick today's verse deterministically — day of year modulo list length.
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const votdIndex = dayOfYear % VOTD_LIST.length;
    const selected = VOTD_LIST[votdIndex];

    const book = getBook(selected.book);
    if (!book) {
      return NextResponse.json({ error: 'Verse not available.' }, { status: 500 });
    }

    // Try to fetch from YouVersion first (BSB = ID 3034), then helloao.org (KJV).
    let verseText: string | null = null;
    let translationUsed = 'BSB';

    // Try YouVersion BSB
    const key = process.env.YOUVERSION_APP_KEY;
    if (key) {
      try {
        const res = await fetch(
          `https://api.youversion.com/v1/bibles/3034/passages/${selected.book}.${selected.chapter}.${selected.verse}`,
          { headers: { 'X-YVP-App-Key': key, 'Accept': 'application/json' }, next: { revalidate: 3600 } },
        );
        if (res.ok) {
          const data = await res.json();
          verseText = data.content?.replace(/<[^>]+>/g, '').trim() || null;
        }
      } catch {}
    }

    // Fallback to helloao.org KJV
    if (!verseText) {
      try {
        const res = await fetch(
          `https://bible.helloao.org/api/eng_kja/${selected.book}/${selected.chapter}.simple.json`,
          { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } },
        );
        if (res.ok) {
          const data = await res.json();
          const verses = (data.chapter?.content || []).filter(
            (item: { type: string; number?: number; text?: string }) =>
              item.type === 'verse' && item.number === selected.verse,
          );
          if (verses.length > 0 && verses[0].text) {
            verseText = verses[0].text;
            translationUsed = 'KJV';
          }
        }
      } catch {}
    }

    if (!verseText) {
      // Final fallback — return the verse reference without text.
      return NextResponse.json({
        reference: `${book.name} ${selected.chapter}:${selected.verse}`,
        text: 'Click to read this verse in the Bible reader.',
        translation: 'KJV',
        book: selected.book,
        chapter: selected.chapter,
        verse: selected.verse,
        bookName: book.name,
      });
    }

    return NextResponse.json({
      reference: `${book.name} ${selected.chapter}:${selected.verse}`,
      text: verseText,
      translation: translationUsed,
      book: selected.book,
      chapter: selected.chapter,
      verse: selected.verse,
      bookName: book.name,
    });
  } catch (error) {
    console.error('VOTD error:', error);
    return NextResponse.json({ error: 'Failed to fetch verse.' }, { status: 500 });
  }
}
