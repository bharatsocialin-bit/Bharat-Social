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
  // ── English ──
  { id: 'KJV', name: 'King James Version', abbr: 'KJV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'WEB', name: 'World English Bible', abbr: 'WEB', languageCode: 'eng', languageName: 'English', source: 'bible-api', attribution: 'Public Domain', publicDomain: true },
  { id: 'ASV', name: 'American Standard Version', abbr: 'ASV', languageCode: 'eng', languageName: 'English', source: 'bible-api', attribution: 'Public Domain', publicDomain: true },
  { id: 'BBE', name: 'Bible in Basic English', abbr: 'BBE', languageCode: 'eng', languageName: 'English', source: 'bible-api', attribution: 'Public Domain', publicDomain: true },
  { id: 'YLT', name: "Young's Literal Translation", abbr: 'YLT', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'LSV', name: 'Literal Standard Version', abbr: 'LSV', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'NHEB', name: 'New Heart English Bible', abbr: 'NHEB', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'WNT', name: 'Weymouth New Testament', abbr: 'WNT', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  { id: 'NET', name: 'New English Translation', abbr: 'NET', languageCode: 'eng', languageName: 'English', source: 'bolls', attribution: 'NET Free', publicDomain: false },
  // ── Hindi ──
  { id: 'IRVHin', name: 'Hindi IRV', abbr: 'IRV-Hin', nativeName: 'ईश्वर निर्वाचित वर्ण (IRV) हिन्दी', languageCode: 'hin', languageName: 'Hindi', languageNative: 'हिन्दी', source: 'bolls', attribution: 'YouVersion', publicDomain: false },
  { id: 'HSB', name: 'Hindi Standard Bible', abbr: 'HSB', nativeName: 'नयी हिन्दी बाइबल', languageCode: 'hin', languageName: 'Hindi', languageNative: 'हिन्दी', source: 'bolls', attribution: 'YouVersion', publicDomain: false },
  // ── Tamil ──
  { id: 'IRVTam', name: 'Tamil IRV', abbr: 'IRV-Tam', nativeName: 'IRV தமிழ்', languageCode: 'tam', languageName: 'Tamil', languageNative: 'தமிழ்', source: 'bolls', attribution: 'YouVersion', publicDomain: false },
  // ── Telugu ──
  { id: 'IRVTel', name: 'Telugu IRV', abbr: 'IRV-Tel', nativeName: 'IRV తెలుగు', languageCode: 'tel', languageName: 'Telugu', languageNative: 'తెలుగు', source: 'bolls', attribution: 'YouVersion', publicDomain: false },
  // ── Malayalam ──
  { id: 'IRVMAL', name: 'Malayalam IRV', abbr: 'IRV-Mal', nativeName: 'IRV മലയാളം', languageCode: 'mal', languageName: 'Malayalam', languageNative: 'മലയാളം', source: 'bolls', attribution: 'YouVersion', publicDomain: false },
  // ── Bengali ──
  { id: 'BLB', name: 'Bengali Living Bible', abbr: 'BLB', nativeName: 'বাংলা লিভিং বাইবল', languageCode: 'ben', languageName: 'Bengali', languageNative: 'বাংলা', source: 'bolls', attribution: 'YouVersion', publicDomain: false },
  // ── Spanish ──
  { id: 'RVR1960', name: 'Reina-Valera 1960', abbr: 'RVR60', nativeName: 'Reina-Valera 1960', languageCode: 'spa', languageName: 'Spanish', languageNative: 'Español', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  // ── French ──
  { id: 'LSG', name: 'Louis Segond 1910', abbr: 'LSG', nativeName: 'Louis Segond 1910', languageCode: 'fra', languageName: 'French', languageNative: 'Français', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  // ── Portuguese ──
  { id: 'ACF', name: 'Almeida Corrigida Fiel', abbr: 'ACF', nativeName: 'Almeida Corrigida Fiel', languageCode: 'por', languageName: 'Portuguese', languageNative: 'Português', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  // ── Chinese ──
  { id: 'CUV', name: 'Chinese Union Version', abbr: 'CUV', nativeName: '和合本', languageCode: 'zho', languageName: 'Chinese', languageNative: '中文', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  // ── Arabic ──
  { id: 'SVD', name: 'Smith Van Dyke Arabic', abbr: 'SVD', nativeName: 'سميث واندايك', languageCode: 'ara', languageName: 'Arabic', languageNative: 'العربية', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
  // ── Russian ──
  { id: 'RUSV', name: 'Russian Synodal', abbr: 'RUSV', nativeName: 'Синодальный перевод', languageCode: 'rus', languageName: 'Russian', languageNative: 'Русский', source: 'bolls', attribution: 'Public Domain', publicDomain: true },
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
