/**
 * Safe parsing helpers for JSON-encoded fields stored in the DB.
 *
 * These exist because `JSON.parse` throws on malformed input, and several
 * routes were calling `JSON.parse(row.field)` directly — a single corrupted
 * row would crash the entire public-list endpoint with a 500. The helpers
 * here always return a sane fallback and log a warning instead of throwing.
 */

/**
 * Parse a JSON-encoded array of post IDs stored on a PulseStory.
 * Returns `[]` on any parse failure or non-array result.
 * Also validates each entry is a string (defensive against bad admin input).
 */
export function safeParsePostIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 100);
}

/**
 * Parse a generic JSON-encoded field. Returns the fallback on any failure.
 */
export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
