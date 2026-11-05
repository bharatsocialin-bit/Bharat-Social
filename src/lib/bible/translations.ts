/**
 * Available Bible translations.
 *
 * Sources:
 *   • bolls.life  — free, no key, 30+ translations including Indian langs.
 *                   Returns verse text + Strong's numbers. Chapter-level fetch.
 *   • bible-api.com — free, no key, KJV/WEB/BBE/ASV + Vulgate. Verse/chapter
 *                   fetch. Cleaner JSON.
 *
 * Each translation declares which API source it lives on, so the client
 * knows where to fetch from. If a translation is on both, bolls.life is
 * preferred (faster chapter fetch + Strong's numbers).
 */

export interface BibleTranslation {
  /** Translation ID used in API routes + the URL. e.g. "KJV", "IRVHin". */
  id: string;
  /** Full display name. */
  name: string;
  /** Short abbreviation shown in compact UI. */
  abbr: string;
  /** Native-language name (for Indian languages). Same as `name` for English. */
  nativeName?: string;
  /** ISO 639-3 language code, e.g. "eng", "hin", "tam". */
  languageCode: string;
  /** English name of the language, e.g. "English", "Hindi", "Tamil". */
  languageName: string;
  /** Native script of the language name, e.g. "हिन्दी", "தமிழ்". */
  languageNative?: string;
  /** Which API serves this translation. */
  source: 'bolls' | 'bible-api';
  /** Source attribution label (e.g. "YouVersion" if the same text is on YV). */
  attribution?: string;
  /** Whether this translation is in the public domain (no copyright concern). */
  publicDomain: boolean;
}

export const TRANSLATIONS: BibleTranslation[] = [
  // ── English (verified working on bolls.life + bible-api.com) ──
  { id: 'KJV', name: 'King James Version', abbr: 'KJV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'WEB', name: 'World English Bible', abbr: 'WEB', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'ASV', name: 'American Standard Version', abbr: 'ASV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'BBE', name: 'Bible in Basic English', abbr: 'BBE', languageCode: 'eng', languageName: 'English', source: 'bible-api', attribution: 'Public Domain', publicDomain: true },
  { id: 'YLT', name: "Young's Literal Translation", abbr: 'YLT', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'LSV', name: 'Literal Standard Version', abbr: 'LSV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'NET', name: 'New English Translation', abbr: 'NET', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'NET Free', publicDomain: false },
  { id: 'ESV', name: 'English Standard Version', abbr: 'ESV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'ESV', publicDomain: false },
  { id: 'NLT', name: 'New Living Translation', abbr: 'NLT', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'NLT', publicDomain: false },
  { id: 'NKJV', name: 'New King James Version', abbr: 'NKJV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'NKJV', publicDomain: false },
  { id: 'GNT', name: 'Good News Translation', abbr: 'GNT', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'GNT', publicDomain: false },
  { id: 'MSG', name: 'The Message', abbr: 'MSG', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'MSG', publicDomain: false },
  { id: 'NASB', name: 'New American Standard Bible', abbr: 'NASB', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'NASB 1995', publicDomain: false },
  { id: 'ERV', name: 'Easy-to-Read Version', abbr: 'ERV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'ERV', publicDomain: false },
  // ── Chinese ──
  { id: 'CUV', name: 'Chinese Union Version', abbr: 'CUV', nativeName: '和合本', languageCode: 'zho', languageName: 'Chinese', languageNative: '中文', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  // ── Arabic ──
  { id: 'SVD', name: 'Smith Van Dyke Arabic', abbr: 'SVD', nativeName: 'سميث واندايك', languageCode: 'ara', languageName: 'Arabic', languageNative: 'العربية', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  // ── Spanish ──
  { id: 'NVI', name: 'Nueva Versión Internacional', abbr: 'NVI', nativeName: 'Nueva Versión Internacional', languageCode: 'spa', languageName: 'Spanish', languageNative: 'Español', source: 'bolls', attribution: 'NVI', publicDomain: false },
  // ── Portuguese ──
  { id: 'OL', name: 'O Livro', abbr: 'OL', nativeName: 'O Livro', languageCode: 'por', languageName: 'Portuguese', languageNative: 'Português', source: 'bolls', attribution: 'OL', publicDomain: false },
  // ── Russian ──
  { id: 'SYNOD', name: 'Russian Synodal Translation', abbr: 'SYNOD', nativeName: 'Синодальный перевод', languageCode: 'rus', languageName: 'Russian', languageNative: 'Русский', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'BTI', name: 'Russian Bible Society Translation', abbr: 'BTI', nativeName: 'Библия РБО', languageCode: 'rus', languageName: 'Russian', languageNative: 'Русский', source: 'bolls', attribution: 'BTI', publicDomain: false },
  // ── Hindi / Tamil / Telugu / Malayalam / Bengali ──
  // These are NOT available on bolls.life or bible-api.com. To add them,
  // the user needs to upload Bible text files (USFM or JSON format) which
  // we'll import via a future self-hosted Bible data pipeline. The
  // translation picker will show these as "Coming Soon" until the data
  // is uploaded.
  { id: 'IRVHin', name: 'Hindi IRV (Coming Soon)', abbr: 'IRV-Hin', nativeName: 'ईश्वर निर्वाचित वर्ण (IRV) हिन्दी', languageCode: 'hin', languageName: 'Hindi', languageNative: 'हिन्दी', source: 'bolls', attribution: 'Coming Soon', publicDomain: false },
  { id: 'IRVTam', name: 'Tamil IRV (Coming Soon)', abbr: 'IRV-Tam', nativeName: 'IRV தமிழ்', languageCode: 'tam', languageName: 'Tamil', languageNative: 'தமிழ்', source: 'bolls', attribution: 'Coming Soon', publicDomain: false },
  { id: 'IRVTel', name: 'Telugu IRV (Coming Soon)', abbr: 'IRV-Tel', nativeName: 'IRV తెలుగు', languageCode: 'tel', languageName: 'Telugu', languageNative: 'తెలుగు', source: 'bolls', attribution: 'Coming Soon', publicDomain: false },
  { id: 'IRVMal', name: 'Malayalam IRV (Coming Soon)', abbr: 'IRV-Mal', nativeName: 'IRV മലയാളം', languageCode: 'mal', languageName: 'Malayalam', languageNative: 'മലയാളം', source: 'bolls', attribution: 'Coming Soon', publicDomain: false },
  { id: 'BLB', name: 'Bengali Living Bible (Coming Soon)', abbr: 'BLB', nativeName: 'বাংলা লিভিং বাইবল', languageCode: 'ben', languageName: 'Bengali', languageNative: 'বাংলা', source: 'bolls', attribution: 'Coming Soon', publicDomain: false },
];

/** Map of translation ID → translation object. */
export const TRANSLATIONS_BY_ID: Record<string, BibleTranslation> = Object.fromEntries(
  TRANSLATIONS.map((t) => [t.id, t]),
);

/** Default translation when the user hasn't picked one. */
export const DEFAULT_TRANSLATION_ID = 'KJV';

export function getTranslation(id: string): BibleTranslation | undefined {
  return TRANSLATIONS_BY_ID[id];
}

/** Group translations by language for the translation picker UI. */
export function translationsByLanguage(): Array<{
  languageCode: string;
  languageName: string;
  languageNative?: string;
  translations: BibleTranslation[];
}> {
  const map = new Map<string, { languageCode: string; languageName: string; languageNative?: string; translations: BibleTranslation[] }>();
  for (const t of TRANSLATIONS) {
    const existing = map.get(t.languageCode);
    if (existing) {
      existing.translations.push(t);
    } else {
      map.set(t.languageCode, {
        languageCode: t.languageCode,
        languageName: t.languageName,
        languageNative: t.languageNative,
        translations: [t],
      });
    }
  }
  // Sort: English first, then alphabetical by language name
  return Array.from(map.values()).sort((a, b) => {
    if (a.languageCode === 'eng') return -1;
    if (b.languageCode === 'eng') return 1;
    return a.languageName.localeCompare(b.languageName);
  });
}
