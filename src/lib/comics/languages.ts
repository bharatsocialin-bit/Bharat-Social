import { translationsByLanguage } from '@/lib/bible/translations';

/**
 * Language catalog for Comic Bible translations (Admin CMS).
 *
 * SOURCE OF TRUTH: the actual Lordsbook Bible translation system
 * (src/lib/bible/translations.ts). NO languages are invented here and no
 * external language configuration is assumed — a language appears in this
 * catalog only if Lordsbook's Bible reader supports at least one Bible
 * translation in it.
 *
 * Artwork (ComicPage rows) is always shared across languages; only text
 * fields are translated.
 */

export interface ComicLanguage {
  /** ISO 639-1-ish code used by the Lordsbook Bible system, e.g. "en", "hi". */
  code: string;
  /** English name, e.g. "English", "Hindi". */
  name: string;
  /** Native script name when known, e.g. "हिन्दी". */
  native: string | null;
  /** How many Bible translations Lordsbook offers in this language. */
  bibleTranslationCount: number;
}

/** English is always first (it is the source language for comic content). */
export function comicLanguageCatalog(): ComicLanguage[] {
  const groups = translationsByLanguage();
  return groups
    .map((g) => ({
      code: g.languageCode,
      name: g.languageName,
      native: g.languageNative ?? null,
      bibleTranslationCount: g.translations.length,
    }))
    .sort((a, b) => {
      if (a.code === 'en') return -1;
      if (b.code === 'en') return 1;
      return a.name.localeCompare(b.name);
    });
}

export const COMIC_TRANSLATION_STATUSES = ['draft', 'in_review', 'published'] as const;
export type ComicTranslationStatus = (typeof COMIC_TRANSLATION_STATUSES)[number];

/** UI states derived from DB presence + status. */
export type TranslationUiState = 'not_started' | ComicTranslationStatus;

/** Legacy seeds may carry "coming_soon" — treated as draft. */
export function normalizeTranslationStatus(raw: string | null | undefined): ComicTranslationStatus {
  if (raw === 'published' || raw === 'in_review') return raw;
  return 'draft';
}

export const TRANSLATION_STATUS_LABEL: Record<TranslationUiState, string> = {
  not_started: 'Not Started',
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
};
