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
  /** ISO 639-1 language code, e.g. "en", "hi", "ta". */
  languageCode: string;
  /** English name of the language, e.g. "English", "Hindi", "Tamil". */
  languageName: string;
  /** Native script of the language name, e.g. "हिन्दी", "தமிழ்". */
  languageNative?: string;
  /** Which API serves this translation. */
  source: 'youversion' | 'bolls' | 'bible-api';
  /** YouVersion Bible ID (numeric, when source = 'youversion'). */
  youversionId?: number;
  /** Source attribution label. */
  attribution?: string;
  /** Whether this translation is in the public domain. */
  publicDomain: boolean;
}

export const TRANSLATIONS: BibleTranslation[] = [
  // ── English ──
  { id: 'YV-BSB', name: 'Berean Standard Bible', abbr: 'BSB', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 3034, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-NIV', name: 'New International Version', abbr: 'NIV', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 111, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NASB', name: 'New American Standard Bible 1995', abbr: 'NASB', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 100, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-AMP', name: 'Amplified Bible', abbr: 'AMP', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 1588, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NIrV', name: "New International Reader's Version", abbr: 'NIrV', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 110, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-ASV', name: 'American Standard Version', abbr: 'ASV', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 12, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-LSV', name: 'Literal Standard Version', abbr: 'LSV', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 2660, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-WEB', name: 'World English Bible', abbr: 'WEB', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 206, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-WMB', name: 'World Messianic Bible', abbr: 'WMB', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 1209, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-CPDV', name: 'Catholic Public Domain Version', abbr: 'CPDV', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 42, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-NASB2020', name: 'New American Standard Bible - NASB 2020', abbr: 'NASB2020', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 2692, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NIVUK', name: 'New International Version (Anglicised)', abbr: 'NIVUK', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 113, attribution: 'YouVersion', publicDomain: false },

  // ── Hindi ──
  { id: 'YV-IRVHin', name: 'इंडियन रिवाइज्ड वर्जन (IRV) हिंदी - 2019', abbr: 'IRV-Hin', nativeName: 'IRV हिंदी', languageCode: 'hi', languageName: 'Hindi', languageNative: 'हिन्दी', source: 'youversion', youversionId: 1980, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-HCV', name: 'सरल हिन्दी बाइबल', abbr: 'HCV', nativeName: 'सरल हिन्दी बाइबल', languageCode: 'hi', languageName: 'Hindi', languageNative: 'हिन्दी', source: 'youversion', youversionId: 1628, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-HHBR', name: 'Hindi Holy Bible', abbr: 'HHBR', nativeName: 'हिन्दी होली बाइबल', languageCode: 'hi', languageName: 'Hindi', languageNative: 'हिन्दी', source: 'youversion', youversionId: 820, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-HSB', name: 'नवीन हिंदी बाइबल', abbr: 'HSB', nativeName: 'नवीन हिंदी बाइबल', languageCode: 'hi', languageName: 'Hindi', languageNative: 'हिन्दी', source: 'youversion', youversionId: 3540, attribution: 'YouVersion', publicDomain: false },

  // ── Tamil ──
  { id: 'YV-IRVTam', name: 'இண்டியன் ரிவைஸ்டு வெர்ஸன் (IRV) - தமிழ்', abbr: 'IRV-Tam', nativeName: 'IRV தமிழ்', languageCode: 'ta', languageName: 'Tamil', languageNative: 'தமிழ்', source: 'youversion', youversionId: 1899, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-TCV', name: 'இந்திய சமகால தமிழ் மொழிப்பெயர்ப்பு 2022', abbr: 'TCV', nativeName: 'TCV தமிழ்', languageCode: 'ta', languageName: 'Tamil', languageNative: 'தமிழ்', source: 'youversion', youversionId: 2730, attribution: 'YouVersion', publicDomain: false },

  // ── Telugu ──
  { id: 'YV-IRVTel', name: 'ఇండియన్ రివైజ్డ్ వెర్షన్ (IRV) - తెలుగు -2019', abbr: 'IRV-Tel', nativeName: 'IRV తెలుగు', languageCode: 'te', languageName: 'Telugu', languageNative: 'తెలుగు', source: 'youversion', youversionId: 1895, attribution: 'YouVersion', publicDomain: false },

  // ── Malayalam ──
  { id: 'YV-MCV', name: 'സമകാലിക മലയാളവിവർത്തനം', abbr: 'MCV', nativeName: 'MCV മലയാളം', languageCode: 'ml', languageName: 'Malayalam', languageNative: 'മലയാളം', source: 'youversion', youversionId: 2431, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-IRVMal', name: 'ഇന്ത്യൻ റിവൈസ്ഡ് വേർഷൻ (IRV) - മലയാളം', abbr: 'IRV-Mal', nativeName: 'IRV മലയാളം', languageCode: 'ml', languageName: 'Malayalam', languageNative: 'മലയാളം', source: 'youversion', youversionId: 1912, attribution: 'YouVersion', publicDomain: false },

  // ── Bengali ──
  { id: 'YV-BCV', name: 'বাংলা সমকালীন সংস্করণ', abbr: 'BCV', nativeName: 'BCV বাংলা', languageCode: 'bn', languageName: 'Bengali', languageNative: 'বাংলা', source: 'youversion', youversionId: 2412, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-IRVBen', name: 'ইন্ডিয়ান রিভাইজড ভার্সন (IRV) - বেঙ্গলী', abbr: 'IRV-Ben', nativeName: 'IRV বাংলা', languageCode: 'bn', languageName: 'Bengali', languageNative: 'বাংলা', source: 'youversion', youversionId: 1883, attribution: 'YouVersion', publicDomain: false },

  // ── Marathi ──
  { id: 'YV-IRVMar', name: 'इंडियन रीवाइज्ड वर्जन (IRV) - मराठी', abbr: 'IRV-Mar', nativeName: 'IRV मराठी', languageCode: 'mr', languageName: 'Marathi', languageNative: 'मराठी', source: 'youversion', youversionId: 1910, attribution: 'YouVersion', publicDomain: false },

  // ── Punjabi ──
  { id: 'YV-IRVPun', name: 'ਇੰਡਿਅਨ ਰਿਵਾਇਜ਼ਡ ਵਰਜ਼ਨ (IRV) - ਪੰਜਾਬੀ', abbr: 'IRV-Pan', nativeName: 'IRV ਪੰਜਾਬੀ', languageCode: 'pa', languageName: 'Punjabi', languageNative: 'ਪੰਜਾਬੀ', source: 'youversion', youversionId: 1884, attribution: 'YouVersion', publicDomain: false },

  // ── Gujarati ──
  { id: 'YV-IRVGuj', name: 'ઇન્ડિયન રીવાઇઝ્ડ વર્ઝન ગુજરાતી - 2019', abbr: 'IRV-Guj', nativeName: 'IRV ગુજરાતી', languageCode: 'gu', languageName: 'Gujarati', languageNative: 'ગુજરાતી', source: 'youversion', youversionId: 1911, attribution: 'YouVersion', publicDomain: false },

  // ── Kannada ──
  { id: 'YV-IRVKan', name: 'ಇಂಡಿಯನ್ ರಿವೈಜ್ಡ್ ವರ್ಸನ್ (IRV) - ಕನ್ನಡ - 2019', abbr: 'IRV-Kan', nativeName: 'IRV ಕನ್ನಡ', languageCode: 'kn', languageName: 'Kannada', languageNative: 'ಕನ್ನಡ', source: 'youversion', youversionId: 1898, attribution: 'YouVersion', publicDomain: false },

  // ── Odia ──
  { id: 'YV-IRVOry', name: 'ଇଣ୍ଡିୟାନ ରିୱାଇସ୍ଡ୍ ୱରସନ୍ ଓଡିଆ', abbr: 'IRV-Odi', nativeName: 'IRV ଓଡ଼ିଆ', languageCode: 'or', languageName: 'Odia', languageNative: 'ଓଡ଼ିଆ', source: 'youversion', youversionId: 2743, attribution: 'YouVersion', publicDomain: false },

  // ── Assamese ──
  { id: 'YV-IRVAsm', name: 'ইণ্ডিয়ান ৰিভাইচ ভাৰচন (IRV) আচামিচ - 2019', abbr: 'IRV-Asm', nativeName: 'IRV অসমীয়া', languageCode: 'as', languageName: 'Assamese', languageNative: 'অসমীয়া', source: 'youversion', youversionId: 1979, attribution: 'YouVersion', publicDomain: false },

  // ── Urdu ──
  { id: 'YV-IRVUrd', name: 'इंडियन रिवाइज्ड वर्जन (IRV) उर्दू - 2019', abbr: 'IRV-Urd', nativeName: 'IRV اردو', languageCode: 'ur', languageName: 'Urdu', languageNative: 'اردو', source: 'youversion', youversionId: 1885, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-UrdGVR', name: 'Kitab-i Muqaddas', abbr: 'GVR', nativeName: 'کتاب مقدس', languageCode: 'ur', languageName: 'Urdu', languageNative: 'اردو', source: 'youversion', youversionId: 1887, attribution: 'YouVersion', publicDomain: false },

  // ── Spanish ──
  { id: 'YV-NVI-S', name: 'Nueva Versión Internacional - Español', abbr: 'NVI', nativeName: 'NVI Español', languageCode: 'es', languageName: 'Spanish', languageNative: 'Español', source: 'youversion', youversionId: 128, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-RVES', name: 'Reina-Valera Antigua', abbr: 'RVA', nativeName: 'Reina-Valera Antigua', languageCode: 'es', languageName: 'Spanish', languageNative: 'Español', source: 'youversion', youversionId: 147, attribution: 'YouVersion', publicDomain: true },

  // ── French ──
  { id: 'YV-LSG', name: 'La Sainte Bible par Louis Segond 1910', abbr: 'LSG', nativeName: 'Louis Segond 1910', languageCode: 'fr', languageName: 'French', languageNative: 'Français', source: 'youversion', youversionId: 93, attribution: 'YouVersion', publicDomain: true },

  // ── Portuguese ──
  { id: 'YV-NVI-PT', name: 'Nova Versão Internacional - Português', abbr: 'NVI-PT', nativeName: 'NVI Português', languageCode: 'pt', languageName: 'Portuguese', languageNative: 'Português', source: 'youversion', youversionId: 129, attribution: 'YouVersion', publicDomain: false },

  // ── Chinese ──
  { id: 'YV-CCB', name: '当代译本', abbr: 'CCB', nativeName: '当代译本', languageCode: 'zh', languageName: 'Chinese', languageNative: '中文', source: 'youversion', youversionId: 36, attribution: 'YouVersion', publicDomain: false },

  // ── Arabic ──
  { id: 'YV-NAV', name: 'كتاب الحياة', abbr: 'NAV', nativeName: 'كتاب الحياة', languageCode: 'ar', languageName: 'Arabic', languageNative: 'العربية', source: 'youversion', youversionId: 101, attribution: 'YouVersion', publicDomain: false },

  // ── Russian ──
  { id: 'YV-NRT', name: 'Новый русский перевод', abbr: 'NRT', nativeName: 'Новый русский перевод', languageCode: 'ru', languageName: 'Russian', languageNative: 'Русский', source: 'youversion', youversionId: 143, attribution: 'YouVersion', publicDomain: false },

  // ── German ──
  { id: 'YV-DELUT', name: 'Lutherbibel 1912', abbr: 'DELUT', nativeName: 'Lutherbibel 1912', languageCode: 'de', languageName: 'German', languageNative: 'Deutsch', source: 'youversion', youversionId: 51, attribution: 'YouVersion', publicDomain: true },
];

/** Map of translation ID → translation object. */
export const TRANSLATIONS_BY_ID: Record<string, BibleTranslation> = Object.fromEntries(
  TRANSLATIONS.map((t) => [t.id, t]),
);

/** Default translation when the user hasn't picked one. */
export const DEFAULT_TRANSLATION_ID = 'YV-BSB';

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
