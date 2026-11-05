/**
 * Bible book metadata — all 66 books with USFM IDs, chapter counts,
 * testament, and group (Law/History/Wisdom/Prophets/Gospels/etc.).
 *
 * USFM IDs are the standard 3-letter book codes used by Bible APIs
 * (bolls.life, bible-api.com, dbt.io, SWORD). The chapter counts are
 * the canonical Protestant counts.
 *
 * Source: https://ubsicap.github.io/usfm/identification/books.html
 */

export type Testament = 'OT' | 'NT';

export type BookGroup =
  | 'Law'
  | 'History'
  | 'Wisdom'
  | 'Prophets'
  | 'Gospels'
  | 'Acts'
  | 'Pauline Epistles'
  | 'General Epistles'
  | 'Apocalyptic';

export interface BibleBook {
  /** USFM 3-letter ID, e.g. "GEN", "JHN". Used in API routes. */
  usfm: string;
  /** Full book name, e.g. "Genesis", "John". Used for display. */
  name: string;
  /** Short name for compact UI, e.g. "Gen", "Jn". */
  short: string;
  /** Old or New Testament. */
  testament: Testament;
  /** Liturgical group — used for the OT/NT subdivision in the book picker. */
  group: BookGroup;
  /** Number of chapters (canonical Protestant count). */
  chapters: number;
  /** Order within the testament (1-based). */
  order: number;
}

export const BIBLE_BOOKS: BibleBook[] = [
  // ── Old Testament ──
  // Law (Pentateuch)
  { usfm: 'GEN', name: 'Genesis', short: 'Gen', testament: 'OT', group: 'Law', chapters: 50, order: 1 },
  { usfm: 'EXO', name: 'Exodus', short: 'Ex', testament: 'OT', group: 'Law', chapters: 40, order: 2 },
  { usfm: 'LEV', name: 'Leviticus', short: 'Lev', testament: 'OT', group: 'Law', chapters: 27, order: 3 },
  { usfm: 'NUM', name: 'Numbers', short: 'Num', testament: 'OT', group: 'Law', chapters: 36, order: 4 },
  { usfm: 'DEU', name: 'Deuteronomy', short: 'Deut', testament: 'OT', group: 'Law', chapters: 34, order: 5 },
  // History
  { usfm: 'JOS', name: 'Joshua', short: 'Josh', testament: 'OT', group: 'History', chapters: 24, order: 6 },
  { usfm: 'JDG', name: 'Judges', short: 'Judg', testament: 'OT', group: 'History', chapters: 21, order: 7 },
  { usfm: 'RUT', name: 'Ruth', short: 'Ruth', testament: 'OT', group: 'History', chapters: 4, order: 8 },
  { usfm: '1SA', name: '1 Samuel', short: '1 Sam', testament: 'OT', group: 'History', chapters: 31, order: 9 },
  { usfm: '2SA', name: '2 Samuel', short: '2 Sam', testament: 'OT', group: 'History', chapters: 24, order: 10 },
  { usfm: '1KI', name: '1 Kings', short: '1 Kgs', testament: 'OT', group: 'History', chapters: 22, order: 11 },
  { usfm: '2KI', name: '2 Kings', short: '2 Kgs', testament: 'OT', group: 'History', chapters: 25, order: 12 },
  { usfm: '1CH', name: '1 Chronicles', short: '1 Chr', testament: 'OT', group: 'History', chapters: 29, order: 13 },
  { usfm: '2CH', name: '2 Chronicles', short: '2 Chr', testament: 'OT', group: 'History', chapters: 36, order: 14 },
  { usfm: 'EZR', name: 'Ezra', short: 'Ezra', testament: 'OT', group: 'History', chapters: 10, order: 15 },
  { usfm: 'NEH', name: 'Nehemiah', short: 'Neh', testament: 'OT', group: 'History', chapters: 13, order: 16 },
  { usfm: 'EST', name: 'Esther', short: 'Est', testament: 'OT', group: 'History', chapters: 10, order: 17 },
  // Wisdom / Poetry
  { usfm: 'JOB', name: 'Job', short: 'Job', testament: 'OT', group: 'Wisdom', chapters: 42, order: 18 },
  { usfm: 'PSA', name: 'Psalms', short: 'Ps', testament: 'OT', group: 'Wisdom', chapters: 150, order: 19 },
  { usfm: 'PRO', name: 'Proverbs', short: 'Prov', testament: 'OT', group: 'Wisdom', chapters: 31, order: 20 },
  { usfm: 'ECC', name: 'Ecclesiastes', short: 'Ecc', testament: 'OT', group: 'Wisdom', chapters: 12, order: 21 },
  { usfm: 'SNG', name: 'Song of Solomon', short: 'Song', testament: 'OT', group: 'Wisdom', chapters: 8, order: 22 },
  // Prophets (Major)
  { usfm: 'ISA', name: 'Isaiah', short: 'Isa', testament: 'OT', group: 'Prophets', chapters: 66, order: 23 },
  { usfm: 'JER', name: 'Jeremiah', short: 'Jer', testament: 'OT', group: 'Prophets', chapters: 52, order: 24 },
  { usfm: 'LAM', name: 'Lamentations', short: 'Lam', testament: 'OT', group: 'Prophets', chapters: 5, order: 25 },
  { usfm: 'EZK', name: 'Ezekiel', short: 'Ezek', testament: 'OT', group: 'Prophets', chapters: 48, order: 26 },
  { usfm: 'DAN', name: 'Daniel', short: 'Dan', testament: 'OT', group: 'Prophets', chapters: 12, order: 27 },
  // Prophets (Minor)
  { usfm: 'HOS', name: 'Hosea', short: 'Hos', testament: 'OT', group: 'Prophets', chapters: 14, order: 28 },
  { usfm: 'JOL', name: 'Joel', short: 'Joel', testament: 'OT', group: 'Prophets', chapters: 3, order: 29 },
  { usfm: 'AMO', name: 'Amos', short: 'Amos', testament: 'OT', group: 'Prophets', chapters: 9, order: 30 },
  { usfm: 'OBA', name: 'Obadiah', short: 'Obad', testament: 'OT', group: 'Prophets', chapters: 1, order: 31 },
  { usfm: 'JON', name: 'Jonah', short: 'Jonah', testament: 'OT', group: 'Prophets', chapters: 4, order: 32 },
  { usfm: 'MIC', name: 'Micah', short: 'Mic', testament: 'OT', group: 'Prophets', chapters: 7, order: 33 },
  { usfm: 'NAM', name: 'Nahum', short: 'Nah', testament: 'OT', group: 'Prophets', chapters: 3, order: 34 },
  { usfm: 'HAB', name: 'Habakkuk', short: 'Hab', testament: 'OT', group: 'Prophets', chapters: 3, order: 35 },
  { usfm: 'ZEP', name: 'Zephaniah', short: 'Zeph', testament: 'OT', group: 'Prophets', chapters: 3, order: 36 },
  { usfm: 'HAG', name: 'Haggai', short: 'Hag', testament: 'OT', group: 'Prophets', chapters: 2, order: 37 },
  { usfm: 'ZEC', name: 'Zechariah', short: 'Zech', testament: 'OT', group: 'Prophets', chapters: 14, order: 38 },
  { usfm: 'MAL', name: 'Malachi', short: 'Mal', testament: 'OT', group: 'Prophets', chapters: 4, order: 39 },

  // ── New Testament ──
  // Gospels
  { usfm: 'MAT', name: 'Matthew', short: 'Matt', testament: 'NT', group: 'Gospels', chapters: 28, order: 1 },
  { usfm: 'MRK', name: 'Mark', short: 'Mark', testament: 'NT', group: 'Gospels', chapters: 16, order: 2 },
  { usfm: 'LUK', name: 'Luke', short: 'Luke', testament: 'NT', group: 'Gospels', chapters: 24, order: 3 },
  { usfm: 'JHN', name: 'John', short: 'John', testament: 'NT', group: 'Gospels', chapters: 21, order: 4 },
  // Acts
  { usfm: 'ACT', name: 'Acts', short: 'Acts', testament: 'NT', group: 'Acts', chapters: 28, order: 5 },
  // Pauline Epistles
  { usfm: 'ROM', name: 'Romans', short: 'Rom', testament: 'NT', group: 'Pauline Epistles', chapters: 16, order: 6 },
  { usfm: '1CO', name: '1 Corinthians', short: '1 Cor', testament: 'NT', group: 'Pauline Epistles', chapters: 16, order: 7 },
  { usfm: '2CO', name: '2 Corinthians', short: '2 Cor', testament: 'NT', group: 'Pauline Epistles', chapters: 13, order: 8 },
  { usfm: 'GAL', name: 'Galatians', short: 'Gal', testament: 'NT', group: 'Pauline Epistles', chapters: 6, order: 9 },
  { usfm: 'EPH', name: 'Ephesians', short: 'Eph', testament: 'NT', group: 'Pauline Epistles', chapters: 6, order: 10 },
  { usfm: 'PHP', name: 'Philippians', short: 'Phil', testament: 'NT', group: 'Pauline Epistles', chapters: 4, order: 11 },
  { usfm: 'COL', name: 'Colossians', short: 'Col', testament: 'NT', group: 'Pauline Epistles', chapters: 4, order: 12 },
  { usfm: '1TH', name: '1 Thessalonians', short: '1 Thess', testament: 'NT', group: 'Pauline Epistles', chapters: 5, order: 13 },
  { usfm: '2TH', name: '2 Thessalonians', short: '2 Thess', testament: 'NT', group: 'Pauline Epistles', chapters: 3, order: 14 },
  { usfm: '1TI', name: '1 Timothy', short: '1 Tim', testament: 'NT', group: 'Pauline Epistles', chapters: 6, order: 15 },
  { usfm: '2TI', name: '2 Timothy', short: '2 Tim', testament: 'NT', group: 'Pauline Epistles', chapters: 4, order: 16 },
  { usfm: 'TIT', name: 'Titus', short: 'Titus', testament: 'NT', group: 'Pauline Epistles', chapters: 3, order: 17 },
  { usfm: 'PHM', name: 'Philemon', short: 'Phlm', testament: 'NT', group: 'Pauline Epistles', chapters: 1, order: 18 },
  // General Epistles
  { usfm: 'HEB', name: 'Hebrews', short: 'Heb', testament: 'NT', group: 'General Epistles', chapters: 13, order: 19 },
  { usfm: 'JAS', name: 'James', short: 'Jas', testament: 'NT', group: 'General Epistles', chapters: 5, order: 20 },
  { usfm: '1PE', name: '1 Peter', short: '1 Pet', testament: 'NT', group: 'General Epistles', chapters: 5, order: 21 },
  { usfm: '2PE', name: '2 Peter', short: '2 Pet', testament: 'NT', group: 'General Epistles', chapters: 3, order: 22 },
  { usfm: '1JN', name: '1 John', short: '1 John', testament: 'NT', group: 'General Epistles', chapters: 5, order: 23 },
  { usfm: '2JN', name: '2 John', short: '2 John', testament: 'NT', group: 'General Epistles', chapters: 1, order: 24 },
  { usfm: '3JN', name: '3 John', short: '3 John', testament: 'NT', group: 'General Epistles', chapters: 1, order: 25 },
  { usfm: 'JUD', name: 'Jude', short: 'Jude', testament: 'NT', group: 'General Epistles', chapters: 1, order: 26 },
  // Apocalyptic
  { usfm: 'REV', name: 'Revelation', short: 'Rev', testament: 'NT', group: 'Apocalyptic', chapters: 22, order: 27 },
];

export const BIBLE_BOOKS_BY_USFM: Record<string, BibleBook> = Object.fromEntries(
  BIBLE_BOOKS.map((b) => [b.usfm, b]),
);

export function getBook(usfm: string): BibleBook | undefined {
  return BIBLE_BOOKS_BY_USFM[usfm.toUpperCase()];
}

export function getBookByName(name: string): BibleBook | undefined {
  const lower = name.toLowerCase().trim();
  return BIBLE_BOOKS.find(
    (b) =>
      b.name.toLowerCase() === lower ||
      b.short.toLowerCase() === lower,
  );
}

/** Get the next book in canonical order (wraps OT→NT). */
export function getNextBook(usfm: string): BibleBook | undefined {
  const idx = BIBLE_BOOKS.findIndex((b) => b.usfm === usfm.toUpperCase());
  if (idx === -1 || idx === BIBLE_BOOKS.length - 1) return undefined;
  return BIBLE_BOOKS[idx + 1];
}

/** Get the previous book in canonical order. */
export function getPrevBook(usfm: string): BibleBook | undefined {
  const idx = BIBLE_BOOKS.findIndex((b) => b.usfm === usfm.toUpperCase());
  if (idx <= 0) return undefined;
  return BIBLE_BOOKS[idx - 1];
}

/** Old Testament books grouped by their liturgical group. */
export const OT_GROUPS: BookGroup[] = ['Law', 'History', 'Wisdom', 'Prophets'];

/** New Testament books grouped by their liturgical group. */
export const NT_GROUPS: BookGroup[] = ['Gospels', 'Acts', 'Pauline Epistles', 'General Epistles', 'Apocalyptic'];

/** Books filtered by testament + grouped. */
export function booksByTestamentGrouped(testament: Testament) {
  const groups = testament === 'OT' ? OT_GROUPS : NT_GROUPS;
  return groups.map((group) => ({
    group,
    books: BIBLE_BOOKS.filter((b) => b.testament === testament && b.group === group),
  }));
}
