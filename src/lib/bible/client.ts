/**
 * Bible text client — fetches chapter text from free, no-key Bible APIs.
 *
 * Sources:
 *   • bolls.life  — primary. Returns verse text + Strong's numbers.
 *                   Endpoint: GET https://bolls.life/get-text/{TRANSLATION}/{BOOK_USFM}/{CHAPTER}/
 *                   Returns: [{ pk, verse, text }]
 *   • bible-api.com — fallback for English-only translations.
 *                   Endpoint: GET https://bible-api.com/{book name} {chapter}?translation={ID}
 *                   Returns: { reference, verses: [{ book_id, book_name, chapter, verse, text }], text }
 *
 * Both APIs are free, require no key, and have no rate limit issues for
 * normal app traffic. Server-side only — never import from client code.
 */

import { getTranslation } from './translations';
import { getBook } from './books';
import { fetchChapterFromYouVersion } from './youversion-client';
import type { BibleVerse, BibleChapter } from './client-types';

// ── bolls.life fetcher ─────────────────────────────────────────────────────

/**
 * Fetch a chapter from bolls.life.
 * bolls.life uses USFM book IDs (GEN, EXO, ... JHN, REV) which match our
 * BIBLE_BOOKS.usfm field directly. Verse text contains <S>1234</S> Strong's
 * tags + <sup>...</sup> footnotes — we strip them for clean display.
 */
async function fetchFromBolls(
  translationId: string,
  usfm: string,
  chapter: number,
): Promise<BibleVerse[] | null> {
  const url = `https://bolls.life/get-text/${translationId}/${usfm}/${chapter}/`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // Cache for 24h — Bible text doesn't change.
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ pk: number; verse: number; text: string }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.map((v) => ({
    verse: v.verse,
    text: cleanBollsText(v.text),
  }));
}

/** Strip Strong's tags, footnote sup tags, and excess whitespace from bolls text. */
function cleanBollsText(raw: string): string {
  return raw
    // Strong's tags: <S>1234</S>
    .replace(/<S>\d+<\/S>/g, '')
    // Footnote sup tags: <sup>...</sup>
    .replace(/<sup>[^<]*<\/sup>/g, '')
    // Any other HTML tags that slip through
    .replace(/<[^>]+>/g, '')
    // Collapse multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Trim each verse
    .trim();
}

// ── bible-api.com fetcher ──────────────────────────────────────────────────

/**
 * Fetch a chapter from bible-api.com.
 * bible-api.com uses book NAMES (not USFM IDs) in the URL — we map our
 * USFM ID to the book name via BIBLE_BOOKS. Translation ID goes in the
 * ?translation= query param. Returns clean text already.
 */
async function fetchFromBibleApi(
  translationId: string,
  usfm: string,
  chapter: number,
): Promise<BibleVerse[] | null> {
  const book = getBook(usfm);
  if (!book) return null;
  // bible-api.com wants lowercase book name with spaces (e.g. "1 john")
  const bookName = book.name.toLowerCase().replace(/\s+/g, ' ');
  const url = `https://bible-api.com/${encodeURIComponent(bookName)}%20${chapter}?translation=${translationId}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    verses: Array<{ book_id: string; book_name: string; chapter: number; verse: number; text: string }>;
  };
  if (!data.verses || data.verses.length === 0) return null;
  return data.verses.map((v) => ({
    verse: v.verse,
    text: v.text.trim(),
  }));
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch a Bible chapter. Tries the source declared on the translation
 * (bolls or bible-api). Returns null if the translation ID is unknown or
 * the API returns nothing.
 *
 * Server-side only.
 */
export async function fetchChapter(
  translationId: string,
  usfm: string,
  chapter: number,
): Promise<BibleChapter | null> {
  const translation = getTranslation(translationId);
  const book = getBook(usfm);
  if (!translation || !book) return null;
  if (chapter < 1 || chapter > book.chapters) return null;

  // ── Strategy 1: YouVersion (if the translation is on YouVersion + key is configured) ──
  if (translation.source === 'youversion' && translation.youversionId) {
    const yvData = await fetchChapterFromYouVersion(
      translation.youversionId,
      usfm,
      chapter,
    );
    if (yvData) {
      // Map the YouVersion response back to our standard shape.
      return {
        ...yvData,
        translation: translationId,
      };
    }
    // If YouVersion fails, fall through to bolls/bible-api for English.
  }

  // ── Strategy 2: bolls.life ──
  let verses: BibleVerse[] | null = null;
  if (translation.source === 'bolls') {
    verses = await fetchFromBolls(translationId, usfm, chapter);
    // If bolls fails, try bible-api.com as a fallback for English.
    if (!verses && translation.languageCode === 'en') {
      verses = await fetchFromBibleApi(translationId, usfm, chapter);
    }
  } else if (translation.source === 'bible-api') {
    verses = await fetchFromBibleApi(translationId, usfm, chapter);
  } else if (translation.source === 'youversion') {
    // YouVersion failed above — try bolls/bible-api as last resort for English.
    if (translation.languageCode === 'en') {
      // Try KJV on bolls as a fallback (since the YV ID might not match bolls IDs).
      verses = await fetchFromBolls('KJV', usfm, chapter);
    }
  }

  if (!verses || verses.length === 0) return null;

  return {
    translation: translationId,
    book: usfm.toUpperCase(),
    bookName: book.name,
    chapter,
    verses,
    verseCount: verses.length,
  };
}

/**
 * Fetch a single verse. Used by the bookmark list to render cached text.
 * Internally fetches the whole chapter and picks the verse — Bible APIs
 * don't all support single-verse fetch efficiently.
 */
export async function fetchVerse(
  translationId: string,
  usfm: string,
  chapter: number,
  verse: number,
): Promise<string | null> {
  const ch = await fetchChapter(translationId, usfm, chapter);
  if (!ch) return null;
  return ch.verses.find((v) => v.verse === verse)?.text ?? null;
}
