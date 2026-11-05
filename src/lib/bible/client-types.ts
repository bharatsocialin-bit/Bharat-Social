/** Shared types for the Bible client (used by both bolls.life and YouVersion clients). */

export interface BibleVerse {
  /** Verse number (1-based). */
  verse: number;
  /** Verse text (cleaned — no HTML, no Strong's tags). */
  text: string;
}

export interface BibleChapter {
  /** Translation ID, e.g. "KJV" or "YV-1980" (YouVersion Bible ID prefixed). */
  translation: string;
  /** Book USFM ID, e.g. "GEN". */
  book: string;
  /** Book display name, e.g. "Genesis". */
  bookName: string;
  /** Chapter number (1-based). */
  chapter: number;
  /** Verses in order. */
  verses: BibleVerse[];
  /** Total verse count. */
  verseCount: number;
}
