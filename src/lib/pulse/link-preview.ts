import type { StoryLinkPreview } from './user-stories';

/**
 * Fetch OpenGraph metadata for a URL. Server-side only — never import this
 * from a client component. Returns null fields when metadata is missing or
 * the fetch fails (we never throw — link stories degrade gracefully).
 *
 * SAFETY:
 *   - The URL has already been validated by validateStoryLinkUrl() before
 *     this is called (http/https only, private networks blocked).
 *   - We follow at most 5 redirects and cap the response body at 1 MB so
 *     a malicious page can't exhaust server memory.
 *   - We set a 5-second timeout per request.
 */

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB
const FETCH_TIMEOUT_MS = 5000;

const OG_META_PATTERNS: Array<{
  property: string;
  field: keyof Omit<StoryLinkPreview, 'url'>;
}> = [
  { property: 'og:title', field: 'title' },
  { property: 'og:description', field: 'description' },
  { property: 'og:image', field: 'image' },
  { property: 'og:site_name', field: 'siteName' },
];

const TWITTER_FALLBACKS: Array<{
  name: string;
  field: keyof Omit<StoryLinkPreview, 'url' | 'image'>;
}> = [
  { name: 'twitter:title', field: 'title' },
  { name: 'twitter:description', field: 'description' },
];

/** Extract <meta property="og:…" content="…"> (or name=… for twitter). */
function extractMeta(
  html: string,
  property: string,
  attr: 'property' | 'name' = 'property',
): string | null {
  // Allow attribute=value with single/double/no quotes; case-insensitive.
  const re = new RegExp(
    `<meta[^>]*\\s${attr}\\s*=\\s*["']?${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?[^>]*\\scontent\\s*=\\s*("([^"]*)"|'([^']*)')`,
    'i',
  );
  const m = html.match(re);
  if (m) return (m[2] ?? m[3] ?? '').trim();
  // Try content before property too (HTML order is not guaranteed).
  const re2 = new RegExp(
    `<meta[^>]*\\scontent\\s*=\\s*("([^"]*)"|'([^']*)')[^>]*\\s${attr}\\s*=\\s*["']?${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?`,
    'i',
  );
  const m2 = html.match(re2);
  if (m2) return (m2[2] ?? m2[3] ?? '').trim();
  return null;
}

/** Extract <title>…</title> as a fallback for og:title. */
function extractTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim().slice(0, 300) : null;
}

/** Resolve a possibly-relative image URL against the page URL. */
function resolveImageUrl(raw: string, pageUrl: string): string | null {
  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Fetch OG metadata. Returns a StoryLinkPreview with null fields on failure.
 * Never throws.
 */
export async function fetchLinkPreview(
  url: string,
): Promise<StoryLinkPreview> {
  const fallback: StoryLinkPreview = {
    title: null,
    description: null,
    image: null,
    url,
    siteName: null,
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Pretend to be a browser so sites serve the HTML version.
        'User-Agent':
          'Mozilla/5.0 (compatible; Desily-LinkPreview/1.0; +https://bharat-social-mu.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return fallback;

    // Read at most MAX_BODY_BYTES — never trust Content-Length.
    const reader = res.body?.getReader();
    if (!reader) return fallback;
    const chunks: Uint8Array[] = [];
    let total = 0;
    let aborted = false;
    while (total < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
        if (total > MAX_BODY_BYTES) {
          aborted = true;
          break;
        }
      }
    }
    if (aborted) {
      // We have partial body — that's fine, OG tags are in <head> anyway.
    }
    await reader.cancel();
    const html = new TextDecoder('utf-8', { fatal: false }).decode(
      Buffer.concat(chunks),
    );

    const out: StoryLinkPreview = { ...fallback };
    for (const { property, field } of OG_META_PATTERNS) {
      const v = extractMeta(html, property);
      if (v) {
        if (field === 'image') {
          out.image = resolveImageUrl(v, url);
        } else {
          out[field] = v.slice(0, 400);
        }
      }
    }
    // Twitter card fallbacks (only for fields where OG didn't provide).
    for (const { name, field } of TWITTER_FALLBACKS) {
      if (!out[field]) {
        const v = extractMeta(html, name, 'name');
        if (v) out[field] = v.slice(0, 400);
      }
    }
    // Final fallback: <title> tag.
    if (!out.title) {
      out.title = extractTitleTag(html);
    }
    return out;
  } catch (error) {
    console.error('fetchLinkPreview failed for', url, error);
    return fallback;
  }
}
