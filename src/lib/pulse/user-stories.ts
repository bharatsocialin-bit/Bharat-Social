/**
 * India Pulse — User Stories validation and shared types.
 *
 * All story-related validation lives here so the API routes and any test
 * scripts share a single source of truth.
 */

export const STORY_KINDS = ['text', 'photo', 'video', 'link'] as const;
export type StoryKind = (typeof STORY_KINDS)[number];

export const STORY_TEXT_MAX = 200;
export const STORY_TEXT_MIN = 1;
export const STORY_LINK_URL_MAX = 2048; // common URL safety ceiling
export const STORY_BG_PALETTE = [
  'saffron',
  'india-green',
  'indigo',
  'rose',
  'amber',
  'teal',
  'violet',
  'slate',
] as const;
export type StoryBgKey = (typeof STORY_BG_PALETTE)[number];

export const STORY_TEXT_COLORS = ['white', 'black'] as const;
export type StoryTextColor = (typeof STORY_TEXT_COLORS)[number];

export const STORY_LIVE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const STORY_ARCHIVE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after archive

/** Tailwind gradient classes per palette key — used by both composer and viewer. */
export const STORY_BG_GRADIENT: Record<StoryBgKey, string> = {
  saffron: 'from-saffron to-amber-600',
  'india-green': 'from-india-green to-emerald-700',
  indigo: 'from-indigo-500 to-purple-700',
  rose: 'from-rose-500 to-pink-700',
  amber: 'from-amber-400 to-orange-600',
  teal: 'from-teal-500 to-cyan-700',
  violet: 'from-violet-500 to-fuchsia-700',
  slate: 'from-slate-600 to-slate-900',
};

export interface StoryLinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  siteName: string | null;
}

/** Public-facing story shape (what APIs return to clients). */
export interface StoryDTO {
  id: string;
  authorId: string;
  kind: StoryKind;
  textContent: string | null;
  mediaUrl: string | null;
  linkUrl: string | null;
  linkPreview: StoryLinkPreview | null;
  backgroundColor: StoryBgKey;
  textColor: StoryTextColor;
  createdAt: string;
  expiresAt: string;
  archivedAt: string | null;
  /** True if the requesting user has viewed this story. */
  viewed: boolean;
  /** Total view count. */
  viewCount: number;
  author: {
    id: string;
    username: string;
    name: string | null;
    avatarGradient: string;
    initials: string;
    avatarUrl: string | null;
  };
}

/** Group of stories by the same author (for the rail UI). */
export interface StoryGroupDTO {
  author: StoryDTO['author'];
  stories: StoryDTO[];
  /** True if the requesting user is the author (their own story slot). */
  isOwn: boolean;
  /** True if all stories in this group have been viewed. */
  allViewed: boolean;
}

// ── Validators ─────────────────────────────────────────────────────────────

export function isStoryKind(v: unknown): v is StoryKind {
  return typeof v === 'string' && (STORY_KINDS as readonly string[]).includes(v);
}

export function isStoryBgKey(v: unknown): v is StoryBgKey {
  return typeof v === 'string' && (STORY_BG_PALETTE as readonly string[]).includes(v);
}

export function isStoryTextColor(v: unknown): v is StoryTextColor {
  return typeof v === 'string' && (STORY_TEXT_COLORS as readonly string[]).includes(v);
}

/**
 * Validate and normalize a story text content. Returns {ok, value} or
 * {error}. Trims whitespace; collapsed to a single line.
 */
export function validateStoryText(
  text: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof text !== 'string') return { ok: false, error: 'Story text is required.' };
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length < STORY_TEXT_MIN) return { ok: false, error: 'Story text is empty.' };
  if (trimmed.length > STORY_TEXT_MAX) {
    return { ok: false, error: `Story text is too long (max ${STORY_TEXT_MAX} chars).` };
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate a story link URL. Returns {ok, value} (normalized URL string) or
 * {error}. Only http/https URLs are accepted; the rest are rejected to
 * prevent javascript: and data: payloads.
 */
export function validateStoryLinkUrl(
  url: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof url !== 'string') return { ok: false, error: 'A link URL is required.' };
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: 'A link URL is required.' };
  if (trimmed.length > STORY_LINK_URL_MAX) {
    return { ok: false, error: 'Link URL is too long.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Please enter a valid URL (e.g. https://example.com).' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http:// and https:// links are allowed.' };
  }
  // Block obvious localhost / private-network URLs to prevent SSRF when we
  // fetch the link preview.
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return { ok: false, error: 'Links to private or local networks are not allowed.' };
  }
  return { ok: true, value: parsed.toString() };
}

/** Resolve a background palette key from arbitrary input (defaults to saffron). */
export function coerceBgKey(v: unknown): StoryBgKey {
  return isStoryBgKey(v) ? v : 'saffron';
}

/** Resolve a text color from arbitrary input (defaults to white). */
export function coerceTextColor(v: unknown): StoryTextColor {
  return isStoryTextColor(v) ? v : 'white';
}
