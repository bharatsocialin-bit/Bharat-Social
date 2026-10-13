/**
 * Fuzzy duplicate detection for quiz questions.
 *
 * Detects near-duplicate question text using:
 *   1. Normalized exact match (case-insensitive, whitespace-collapsed)
 *   2. Abbreviation expansion ("PM" → "Prime Minister", etc.)
 *   3. Levenshtein similarity ratio (threshold-based)
 *
 * Used as a REVIEW WARNING (not automatic rejection) — legitimate
 * distinct questions with similar wording should pass, but the reviewer
 * is alerted to check for potential duplicates.
 */

// ── Abbreviation expansion ──────────────────────────────────────────────────
// Maps common abbreviations to their expanded forms so that
// "Who was the first PM of India?" and "Who was the first Prime Minister of India?"
// are detected as near-duplicates.
const ABBREVIATIONS: Record<string, string> = {
  'pm': 'prime minister',
  'cm': 'chief minister',
  'pres': 'president',
  'mp': 'member of parliament',
  'mla': 'member of legislative assembly',
  'gdp': 'gross domestic product',
  'rbi': 'reserve bank of india',
  'isro': 'indian space research organisation',
  'iit': 'indian institute of technology',
  'iim': 'indian institute of management',
  'aiims': 'all india institute of medical sciences',
  'upsc': 'union public service commission',
  'ssc': 'staff selection commission',
  'gst': 'goods and services tax',
  'rte': 'right to education',
  'rti': 'right to information',
  'ngos': 'non governmental organizations',
  'ngo': 'non governmental organization',
  'fdi': 'foreign direct investment',
  'fii': 'foreign institutional investor',
  'sebi': 'securities and exchange board of india',
  'nasa': 'national aeronautics and space administration',
  'un': 'united nations',
  'uk': 'united kingdom',
  'usa': 'united states of america',
  'us': 'united states',
  'bce': 'before common era',
  'ce': 'common era',
  'aka': 'also known as',
};

/**
 * Normalize text for comparison:
 *   - lowercase
 *   - trim
 *   - collapse whitespace
 *   - remove punctuation (except apostrophes within words)
 *   - expand common abbreviations
 */
export function normalizeForComparison(text: string): string {
  let normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s']/g, ' ')  // replace punctuation with space (keep apostrophes)
    .replace(/\s+/g, ' ');

  // Expand abbreviations (word-boundary aware)
  for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${escapeRegex(abbr)}\\b`, 'g');
    normalized = normalized.replace(regex, full);
  }

  return normalized.trim();
}

/**
 * Compute Levenshtein distance between two strings.
 * Classic dynamic programming implementation.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows for memory efficiency
  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);

  for (let j = 0; j <= n; j++) prevRow[j] = j;

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,        // deletion
        currRow[j - 1] + 1,    // insertion
        prevRow[j - 1] + cost, // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[n];
}

/**
 * Compute similarity ratio (0.0 to 1.0) between two strings.
 * 1.0 = identical, 0.0 = completely different.
 * Based on Levenshtein distance normalized by the longer string's length.
 */
export function similarityRatio(a: string, b: string): number {
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - dist / maxLen;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Duplicate detection result ──────────────────────────────────────────────

export interface DuplicateCheckResult {
  /** True if an exact or near-duplicate was found. */
  isDuplicate: boolean;
  /** True if this is an exact match after normalization (automatic rejection). */
  isExactDuplicate: boolean;
  /** True if this is a fuzzy match above the warning threshold (review warning). */
  isNearDuplicate: boolean;
  /** Similarity ratio (0.0 to 1.0) of the closest match. */
  similarity: number;
  /** The matching text (if any). */
  matchedText: string | null;
  /** Human-readable reason for the flag. */
  reason: string | null;
}

/** Threshold above which a near-duplicate warning is issued. */
const NEAR_DUPLICATE_THRESHOLD = 0.85;

/**
 * Check if a question text is a duplicate of any text in the existing set.
 *
 * @param newText The question text to check.
 * @param existingTexts Array of existing question texts (raw, unnormalized).
 * @returns DuplicateCheckResult with the assessment.
 */
export function checkDuplicate(
  newText: string,
  existingTexts: string[],
): DuplicateCheckResult {
  const normalizedNew = normalizeForComparison(newText);

  let bestSimilarity = 0;
  let bestMatch: string | null = null;
  let bestIsExact = false;

  for (const existing of existingTexts) {
    const normalizedExisting = normalizeForComparison(existing);

    // Exact match (after normalization + abbreviation expansion)
    if (normalizedNew === normalizedExisting) {
      return {
        isDuplicate: true,
        isExactDuplicate: true,
        isNearDuplicate: false,
        similarity: 1.0,
        matchedText: existing,
        reason: 'Exact duplicate (after normalization and abbreviation expansion)',
      };
    }

    // Fuzzy match (Levenshtein similarity)
    const sim = similarityRatio(normalizedNew, normalizedExisting);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = existing;
      bestIsExact = false;
    }
  }

  if (bestSimilarity >= NEAR_DUPLICATE_THRESHOLD) {
    return {
      isDuplicate: true,
      isExactDuplicate: false,
      isNearDuplicate: true,
      similarity: bestSimilarity,
      matchedText: bestMatch,
      reason: `Near-duplicate (${Math.round(bestSimilarity * 100)}% similar) — review recommended`,
    };
  }

  return {
    isDuplicate: false,
    isExactDuplicate: false,
    isNearDuplicate: false,
    similarity: bestSimilarity,
    matchedText: bestMatch,
    reason: null,
  };
}
