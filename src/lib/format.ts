// Small formatting helpers used across the social components.

/** Format a like/reply count into a short, human-friendly string: 1.2k, 18.4k, etc. */
export function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) {
    const v = n / 1000;
    return `${v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, '')}k`;
  }
  const v = n / 1_000_000;
  return `${v.toFixed(1).replace(/\.0$/, '')}M`;
}

/** Compact relative time: "8m", "5h", "3d", or a short date for older posts. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Fuller, locale-aware timestamp used in tooltips / profile views. */
export function fullTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const LANG_LABEL: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  bn: 'বাংলা',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  or: 'ଓଡ଼ିଆ',
  ur: 'اردو',
};

export function languageLabel(code: string): string {
  return LANG_LABEL[code] ?? code;
}

/**
 * Short label for the Translate toggle UI, kept compact so it fits inline
 * under a post (e.g. "EN", "हि", "తె").
 */
const LANG_SHORT: Record<string, string> = {
  en: 'EN',
  hi: 'हि',
  te: 'తె',
  ta: 'த',
  bn: 'বা',
  mr: 'म',
  kn: 'ಕ',
  ml: 'മ',
  gu: 'ગુ',
  pa: 'ਪੰ',
  or: 'ଓ',
  ur: 'اردو',
};

export function languageShortLabel(code: string): string {
  return LANG_SHORT[code] ?? code.toUpperCase();
}
