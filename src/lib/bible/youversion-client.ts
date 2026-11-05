/**
 * YouVersion Platform API client — fetches Bible text from YouVersion's
 * official REST API (api.youversion.com).
 *
 * REQUIRES: YOUVERSION_APP_KEY environment variable (server-only).
 * Get yours at https://platform.youversion.com
 *
 * API docs: https://developers.youversion.com/api-usage
 * Endpoint: GET https://api.youversion.com/v1/bibles/{bible_id}/passages/{USFM_REF}
 * Auth: X-YVP-App-Key header
 *
 * The passage response contains HTML content. We parse it to extract
 * individual verses for the scroll-mode reader.
 */

import type { BibleVerse, BibleChapter } from './client-types';
import { getBook } from './books';

const YV_API_BASE = 'https://api.youversion.com/v1';

/** Whether the YouVersion integration is enabled (key is configured). */
export function isYouVersionEnabled(): boolean {
  return !!process.env.YOUVERSION_APP_KEY;
}

/** Get the App Key from env. Returns null if not configured. */
function getAppKey(): string | null {
  return process.env.YOUVERSION_APP_KEY || null;
}

/**
 * Fetch a Bible chapter from YouVersion.
 *
 * @param bibleId - YouVersion Bible ID (numeric, e.g. 1980 for Hindi IRV)
 * @param usfm - Book USFM ID (e.g. "GEN", "JHN")
 * @param chapter - Chapter number (1-based)
 * @returns BibleChapter or null if the fetch fails
 */
export async function fetchChapterFromYouVersion(
  bibleId: number,
  usfm: string,
  chapter: number,
): Promise<BibleChapter | null> {
  const key = getAppKey();
  if (!key) return null;

  const book = getBook(usfm);
  if (!book) return null;

  // YouVersion uses USFM references like "GEN.1" for chapter 1 of Genesis.
  const passageRef = `${usfm.toUpperCase()}.${chapter}`;
  const url = `${YV_API_BASE}/bibles/${bibleId}/passages/${passageRef}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-YVP-App-Key': key,
        'Accept': 'application/json',
      },
      // Cache for 24 hours — Bible text doesn't change.
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { id: string; content: string; reference: string };
    if (!data.content) return null;

    // Parse the HTML content to extract individual verses.
    const verses = parseYouVersion(data.content);
    if (verses.length === 0) return null;

    return {
      translation: String(bibleId), // Will be mapped back by the caller
      book: usfm.toUpperCase(),
      bookName: book.name,
      chapter,
      verses,
      verseCount: verses.length,
    };
  } catch {
    return null;
  }
}

/**
 * Parse YouVersion HTML content to extract individual verses.
 *
 * YouVersion HTML uses various patterns for verse markers:
 *   - <span class="v" data-v="1">1</span> text...
 *   - <sup>1</sup> text...
 *   - In some translations, verse numbers are in <span> with class "verse"
 *
 * We try multiple parsing strategies and fall back to a regex approach
 * that handles the most common patterns.
 */
function parseYouVersion(html: string): BibleVerse[] {
  const verses: BibleVerse[] = [];

  // Strategy 1: Look for YouVersion's standard verse wrapper
  // Pattern: <span class="v" ...>1</span> or <sup class="v">1</sup>
  // The verse text follows until the next verse marker.
  const verseMarkerRegex = /<(?:span|sup)[^>]*(?:class="[^"]*v[^"]*"|data-v="(\d+)")[^>]*>(\d+)<\/(?:span|sup)>/gi;
  
  // Strategy 2: Some translations use <p> tags with verse numbers
  // Pattern: <p>...<span class="v">1</span>In the beginning...</p>
  
  // Strategy 3: Fallback — strip all HTML and look for verse number patterns
  // in the plain text (e.g. "1In the beginning 2And the earth...")

  // Try Strategy 1 first — most reliable for YouVersion HTML
  const matches: Array<{ verse: number; index: number }> = [];
  let match;
  while ((match = verseMarkerRegex.exec(html)) !== null) {
    const verseNum = parseInt(match[2] || match[1] || '0', 10);
    if (verseNum > 0) {
      matches.push({ verse: verseNum, index: match.index + match[0].length });
    }
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      // Find where the next verse marker begins (search backwards from the
      // next marker's position to find the start of its HTML tag).
      const actualEnd = i + 1 < matches.length
        ? findMarkerStart(html, matches[i + 1].index)
        : html.length;
      const verseHtml = html.slice(start, actualEnd);
      const text = stripHtml(verseHtml).trim();
      if (text) {
        verses.push({ verse: matches[i].verse, text });
      }
    }
    if (verses.length > 0) return verses;
  }

  // Strategy 2: Try a simpler approach — split by verse number patterns
  // in the plain text after stripping HTML
  const plainText = stripHtml(html).trim();
  if (plainText) {
    // Look for patterns like "1 " at the start of verses
    const verseSplit = plainText.split(/(?<=\s)(\d+)\s+/);
    // This is unreliable — only use as last resort
    // If we can't parse verses, return the whole text as verse 1
    if (verses.length === 0) {
      verses.push({ verse: 1, text: plainText });
    }
  }

  return verses;
}

/**
 * Find the start of a verse marker by searching backwards from a position.
 * `afterMarkerEnd` is the position AFTER the previous verse marker's full match.
 * We search backwards from there to find the start of the next verse marker's HTML tag.
 */
function findMarkerStart(html: string, afterMarkerEnd: number): number {
  // Search backwards for the start of the previous HTML tag
  // (which is the end of the current verse's text).
  const searchStart = Math.max(0, afterMarkerEnd - 300);
  const searchArea = html.slice(searchStart, afterMarkerEnd);
  const lastTagStart = searchArea.lastIndexOf('<');
  if (lastTagStart >= 0) {
    return searchStart + lastTagStart;
  }
  return afterMarkerEnd;
}

/** Strip HTML tags and normalize whitespace. */
function stripHtml(html: string): string {
  return html
    // Remove all HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * List all Bibles available to this app key, optionally filtered by language.
 * Returns the raw YouVersion response for the translations list builder.
 */
export async function listYouVersionBibles(languageCode?: string): Promise<Array<{
  id: number;
  title: string;
  abbreviation: string;
  languageTag: string;
  bookCount: number;
}> | null> {
  const key = getAppKey();
  if (!key) return null;

  const params = languageCode ? `?language_ranges[]=${languageCode}` : '';
  const url = `${YV_API_BASE}/bibles${params}`;

  try {
    const res = await fetch(url, {
      headers: { 'X-YVP-App-Key': key, 'Accept': 'application/json' },
      next: { revalidate: 21600 }, // 6 hour cache
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      data: Array<{
        id: number;
        title: string;
        localized_title: string;
        abbreviation: string;
        localized_abbreviation: string;
        language_tag: string;
        books: string[];
      }>;
    };

    return (data.data || []).map((b) => ({
      id: b.id,
      title: b.localized_title || b.title,
      abbreviation: b.localized_abbreviation || b.abbreviation,
      languageTag: b.language_tag,
      bookCount: Array.isArray(b.books) ? b.books.length : 0,
    }));
  } catch {
    return null;
  }
}
