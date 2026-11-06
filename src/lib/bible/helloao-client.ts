/**
 * bible.helloao.org API client — fetches Bible text from a free,
 * no-key API that hosts 1,500+ Bible translations from eBible.org.
 *
 * API docs: https://bible.helloao.org/docs/reference/translations/
 * Endpoint: GET https://bible.helloao.org/api/{translation_id}/{BOOK}/{CHAPTER}.simple.json
 *
 * The "simple" format returns clean verse-by-verse JSON:
 *   { chapter: { content: [ { type: "verse", number: 1, text: "..." }, ... ] } }
 *
 * Source: eBible.org (all translations are public domain or freely licensed).
 * This is the same data source that powers ebible.org's study tools.
 *
 * Server-side only — never import from client code.
 */

import { getBook } from './books';
import type { BibleVerse, BibleChapter } from './client-types';

const HELLOAO_BASE = 'https://bible.helloao.org/api';

/**
 * Fetch a Bible chapter from bible.helloao.org.
 *
 * @param translationId - helloao.org translation ID (e.g. "eng_kja" for KJV, "ENGWEBP" for WEB)
 * @param usfm - Book USFM ID (e.g. "GEN", "JHN")
 * @param chapter - Chapter number (1-based)
 * @returns BibleChapter or null if the fetch fails
 */
export async function fetchChapterFromHelloao(
  translationId: string,
  usfm: string,
  chapter: number,
): Promise<Omit<BibleChapter, 'translation'> | null> {
  const book = getBook(usfm);
  if (!book) return null;

  const bookUsfm = usfm.toUpperCase();
  // Use the "simple" format — it has clean verse-by-verse JSON.
  const url = `${HELLOAO_BASE}/${translationId}/${bookUsfm}/${chapter}.simple.json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Cache for 24 hours — Bible text doesn't change.
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      chapter?: {
        number?: number;
        content?: Array<
          | { type: 'verse'; number: number; text: string; footnotes?: unknown[] }
          | { type: 'line_break'; paragraph?: string }
          | { type: string; [key: string]: unknown }
        >;
      };
    };

    if (!data.chapter?.content) return null;

    // Extract verses from the content array (filter out line_breaks and other types).
    const verses: BibleVerse[] = [];
    for (const item of data.chapter.content) {
      if (item.type === 'verse' && typeof item.number === 'number' && typeof item.text === 'string') {
        verses.push({ verse: item.number, text: item.text.trim() });
      }
    }

    if (verses.length === 0) return null;

    // Sort by verse number (some translations may have non-sequential ordering).
    verses.sort((a, b) => a.verse - b.verse);

    return {
      book: bookUsfm,
      bookName: book.name,
      chapter,
      verses,
      verseCount: verses.length,
    };
  } catch {
    return null;
  }
}
