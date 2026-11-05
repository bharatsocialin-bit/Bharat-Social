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
  source: 'youversion' | 'bolls' | 'bible-api' | 'helloao';
  /** YouVersion Bible ID (numeric, when source = 'youversion'). */
  youversionId?: number;
  /** helloao.org translation ID (string, when source = 'helloao'). */
  helloaoId?: string;
  /** Source attribution label. */
  attribution?: string;
  /** Whether this translation is in the public domain. */
  publicDomain: boolean;
}

export const TRANSLATIONS: BibleTranslation[] = [
  // ── English ──
  { id: 'YV-BSB', name: 'Berean Standard Bible', abbr: 'BSB', languageCode: 'en', languageName: 'English', source: 'youversion', youversionId: 3034, attribution: 'YouVersion', publicDomain: true },
  // KJV + WEB via helloao.org (free, no key, public domain)
  { id: 'KJV', name: 'King James Version', abbr: 'KJV', languageCode: 'en', languageName: 'English', source: 'helloao', helloaoId: 'eng_kja', attribution: 'Public Domain (eBible.org)', publicDomain: true },
  { id: 'WEB', name: 'World English Bible', abbr: 'WEB', languageCode: 'en', languageName: 'English', source: 'helloao', helloaoId: 'ENGWEBP', attribution: 'Public Domain (eBible.org)', publicDomain: true },
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

  // ── Africa: Swahili, Amharic, Yoruba, Igbo, Hausa, Shona, Ndebele, Chichewa, Lingala, Malagasy, Ewe, Twi, Luganda, Luo, Dinka ──
  { id: 'YV-NEN', name: 'Neno (Kiswahili Contemporary Version)', abbr: 'NEN', nativeName: 'Neno', languageCode: 'sw', languageName: 'Swahili', languageNative: 'Kiswahili', source: 'youversion', youversionId: 1627, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NASV', name: 'አዲሱ መደበኛ ትርጒም', abbr: 'NASV', nativeName: 'አዲሱ መደበኛ ትርጒም', languageCode: 'am', languageName: 'Amharic', languageNative: 'አማርኛ', source: 'youversion', youversionId: 1260, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-YCB', name: 'Bíbélì Mímọ́ ní Èdè Yorùbá Òde-Òní', abbr: 'YCB', nativeName: 'Bíbélì Mímọ́ Yorùbá', languageCode: 'yo', languageName: 'Yoruba', languageNative: 'Yorùbá', source: 'youversion', youversionId: 911, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-ICB', name: 'Baịbụlụ Nsọ nʼIgbo Ndị Ugbu a', abbr: 'ICB', nativeName: 'Baịbụlụ Igbo', languageCode: 'ig', languageName: 'Igbo', languageNative: 'Igbo', source: 'youversion', youversionId: 1624, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-HCB', name: 'Sabon Rai Don Kowa 2020', abbr: 'HCB', nativeName: 'Sabon Rai Don Kowa', languageCode: 'ha', languageName: 'Hausa', languageNative: 'Hausa', source: 'youversion', youversionId: 1614, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-SCB', name: 'Bhaibheri Dzvene MuChiShona Chanhasi', abbr: 'SCB', nativeName: 'Bhaibheri ChiShona', languageCode: 'sn', languageName: 'Shona', languageNative: 'ChiShona', source: 'youversion', youversionId: 32, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NCB', name: 'IBhayibhili Elingcwele LesiNdebele', abbr: 'NCB', nativeName: 'IBhayibhili Ndebele', languageCode: 'nd', languageName: 'Ndebele', languageNative: 'isiNdebele', source: 'youversion', youversionId: 1626, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-CCL', name: 'Mawu a Mulungu mu Chichewa Chalero', abbr: 'CCL', nativeName: 'Mawu a Mulungu', languageCode: 'ny', languageName: 'Chichewa', languageNative: 'Chichewa', source: 'youversion', youversionId: 1618, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-LCV', name: 'Mokanda na Bomoi', abbr: 'LCV', nativeName: 'Mokanda na Bomoi', languageCode: 'ln', languageName: 'Lingala', languageNative: 'Lingála', source: 'youversion', youversionId: 1964, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-MG1865', name: 'Malagasy Bible', abbr: 'MG1865', nativeName: 'Malagasy Bible', languageCode: 'mg', languageName: 'Malagasy', languageNative: 'Malagasy', source: 'youversion', youversionId: 96, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-ECS', name: 'Agbenya La', abbr: 'ECS', nativeName: 'Agbenya La', languageCode: 'ee', languageName: 'Ewe', languageNative: 'Eʋegbe', source: 'youversion', youversionId: 1613, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-ASCB', name: 'Asante Twi Nkwa Asɛm', abbr: 'ASCB', nativeName: 'Asante Twi Nkwa Asɛm', languageCode: 'tw', languageName: 'Twi (Asante)', languageNative: 'Twi', source: 'youversion', youversionId: 2094, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-LCB', name: 'Endagaano Enkadde n’Endagaano Empya', abbr: 'LCB', nativeName: 'Endagaano Luganda', languageCode: 'lg', languageName: 'Luganda', languageNative: 'Luganda', source: 'youversion', youversionId: 1625, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NLT', name: 'Motingʼo Loko Manyien', abbr: 'NLT', nativeName: 'Motingʼo Loko Manyien', languageCode: 'luo', languageName: 'Luo', languageNative: 'Dholuo', source: 'youversion', youversionId: 2652, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-DIK', name: 'Lëk yam (Dinka Rek)', abbr: 'DIK', nativeName: 'Lëk yam', languageCode: 'din', languageName: 'Dinka', languageNative: 'Thuɔŋjäŋ', source: 'youversion', youversionId: 242, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-ffm', name: 'Fulfulde, Maasina NT', abbr: 'ffm', nativeName: 'Fulfulde Maasina', languageCode: 'ff', languageName: 'Fulfulde', languageNative: 'Fulfulde', source: 'youversion', youversionId: 1175, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-MMNT', name: 'Makhuwa-Meetto New Testament', abbr: 'MMNT', nativeName: 'Makhuwa-Meetto NT', languageCode: 'vmw', languageName: 'Makhuwa', languageNative: 'Emakhuwa', source: 'youversion', youversionId: 2761, attribution: 'YouVersion', publicDomain: true },

  // ── Asia: Chinese, Indonesian, Tagalog, Korean, Japanese, Thai, Vietnamese, Persian, Manipuri, Santali ──
  // (Chinese CCB already added above — skip duplicate)
  { id: 'YV-AGS', name: 'Alkitab Gratis untuk Semua', abbr: 'AGS', nativeName: 'Alkitab Gratis', languageCode: 'id', languageName: 'Indonesian', languageNative: 'Bahasa Indonesia', source: 'youversion', youversionId: 3384, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-ASD', name: 'Ang Salita ng Diyos (Tagalog Contemporary Bible)', abbr: 'ASD', nativeName: 'Ang Salita ng Diyos', languageCode: 'tl', languageName: 'Tagalog', languageNative: 'Tagalog', source: 'youversion', youversionId: 1264, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-KLB', name: '현대인의 성경 (Korean Living Bible)', abbr: 'KLB', nativeName: '현대인의 성경', languageCode: 'ko', languageName: 'Korean', languageNative: '한국어', source: 'youversion', youversionId: 86, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-JCB', name: 'リビングバイブル (Japanese Contemporary Bible)', abbr: 'JCB', nativeName: 'リビングバイブル', languageCode: 'ja', languageName: 'Japanese', languageNative: '日本語', source: 'youversion', youversionId: 83, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-ThaiKJV', name: 'พระคัมภีร์ภาษาไทยฉบับ KJV', abbr: 'ThaiKJV', nativeName: 'พระคัมภีร์ไทย', languageCode: 'th', languageName: 'Thai', languageNative: 'ไทย', source: 'youversion', youversionId: 175, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-VCB', name: 'Kinh Thánh Hiện Đại (Vietnamese Contemporary Bible)', abbr: 'VCB', nativeName: 'Kinh Thánh Hiện Đại', languageCode: 'vi', languageName: 'Vietnamese', languageNative: 'Tiếng Việt', source: 'youversion', youversionId: 1638, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-PCB', name: 'کتاب مقدس، ترجمۀ معاصر (Persian Contemporary Bible)', abbr: 'PCB', nativeName: 'کتاب مقدس', languageCode: 'fa', languageName: 'Persian', languageNative: 'فارسی', source: 'youversion', youversionId: 1619, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-RSM', name: 'Anouba Warepnaba (Roman Script)', abbr: 'RSM', nativeName: 'Anouba Warepnaba', languageCode: 'mni', languageName: 'Manipuri', languageNative: 'মৈতৈ লোন্', source: 'youversion', youversionId: 3297, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-NTSPt26', name: 'इसोराक्‌ दुला़ड़ आड़ाङ', abbr: 'NTSPt26', nativeName: 'इसोराक्‌ दुला़ड़', languageCode: 'sat', languageName: 'Santali', languageNative: 'ᱥᱟᱱᱛᱟᱲᱤ', source: 'youversion', youversionId: 4495, attribution: 'YouVersion', publicDomain: true },

  // ── Europe: Italian, Dutch, Swedish, Danish, Finnish, Polish, Romanian, Ukrainian, Czech, Hungarian, Norwegian, Greek ──
  { id: 'YV-DB1885', name: 'Diodati Bibbia 1885', abbr: 'DB1885', nativeName: 'Diodati Bibbia', languageCode: 'it', languageName: 'Italian', languageNative: 'Italiano', source: 'youversion', youversionId: 54, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-HTB', name: 'Het Boek 2007', abbr: 'HTB', nativeName: 'Het Boek', languageCode: 'nl', languageName: 'Dutch', languageNative: 'Nederlands', source: 'youversion', youversionId: 75, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NUB', name: 'nuBibeln (Swedish Contemporary Bible)', abbr: 'NUB', nativeName: 'nuBibeln', languageCode: 'sv', languageName: 'Swedish', languageNative: 'Svenska', source: 'youversion', youversionId: 916, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-BDAN', name: 'Bibelen på Hverdagsdansk', abbr: 'BDAN', nativeName: 'Bibelen Hverdagsdansk', languageCode: 'da', languageName: 'Danish', languageNative: 'Dansk', source: 'youversion', youversionId: 4555, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-FI1776', name: 'Finnish 1776', abbr: 'FI1776', nativeName: 'Finnish 1776', languageCode: 'fi', languageName: 'Finnish', languageNative: 'Suomi', source: 'youversion', youversionId: 60, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-PBG', name: 'Biblia Gdańska', abbr: 'PBG', nativeName: 'Biblia Gdańska', languageCode: 'pl', languageName: 'Polish', languageNative: 'Polski', source: 'youversion', youversionId: 132, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-NTR', name: 'Noua Traducere Românească', abbr: 'NTR', nativeName: 'Noua Traducere Românească', languageCode: 'ro', languageName: 'Romanian', languageNative: 'Română', source: 'youversion', youversionId: 126, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-UKRK', name: 'Біблія в пер. П.Куліша та І.Пулюя, 1905', abbr: 'UKRK', nativeName: 'Біблія Куліша', languageCode: 'uk', languageName: 'Ukrainian', languageNative: 'Українська', source: 'youversion', youversionId: 188, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-ces1613', name: 'Bible Kralická 1613', abbr: 'ces1613', nativeName: 'Bible Kralická', languageCode: 'cs', languageName: 'Czech', languageNative: 'Čeština', source: 'youversion', youversionId: 44, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-CSIA', name: 'Hungarian Bible by Lajos Csia', abbr: 'CSIA', nativeName: 'Hungarian Bible Csia', languageCode: 'hu', languageName: 'Hungarian', languageNative: 'Magyar', source: 'youversion', youversionId: 526, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-NLB', name: 'Norwegian Living Bible', abbr: 'NLB', nativeName: 'Norwegian Living Bible', languageCode: 'no', languageName: 'Norwegian', languageNative: 'Norsk', source: 'youversion', youversionId: 115, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-grcF35', name: 'The Greek New Testament According to Family 35', abbr: 'grcF35', nativeName: 'Greek NT Family 35', languageCode: 'el', languageName: 'Greek', languageNative: 'Ελληνικά', source: 'youversion', youversionId: 3130, attribution: 'YouVersion', publicDomain: true },

  // ── Americas: Haitian Creole, Quechua, Guarani ──
  { id: 'YV-hatbsa', name: 'Bib Sen An: Kreyòl Ayisyen', abbr: 'hatbsa', nativeName: 'Bib Kreyòl Ayisyen', languageCode: 'ht', languageName: 'Haitian Creole', languageNative: 'Kreyòl Ayisyen', source: 'youversion', youversionId: 3821, attribution: 'YouVersion', publicDomain: false },
  { id: 'YV-qub', name: 'Quechua, Huallaga Huánuco', abbr: 'qub', nativeName: 'Quechua Huallaga', languageCode: 'qu', languageName: 'Quechua', languageNative: 'Runa Simi', source: 'youversion', youversionId: 1088, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-gui', name: 'Nuevo Testamento Guaraní Pe', abbr: 'gui', nativeName: 'Guaraní Pe', languageCode: 'gn', languageName: 'Guarani', languageNative: 'Avañeẽ', source: 'youversion', youversionId: 590, attribution: 'YouVersion', publicDomain: true },

  // ── Additional: Kikongo, Kinyarwanda, Bodo, Burmese, Khmer, Sinhala ──
  { id: 'YV-MKongoBu', name: 'Bible en mashi du Congo (Kikongo)', abbr: 'MKongoBu', nativeName: 'Bible Kikongo', languageCode: 'kg', languageName: 'Kikongo', languageNative: 'Kikongo', source: 'youversion', youversionId: 3953, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-nyj', name: 'Bible en Kinyarwanda', abbr: 'nyj', nativeName: 'Bible Kinyarwanda', languageCode: 'rw', languageName: 'Kinyarwanda', languageNative: 'Kinyarwanda', source: 'youversion', youversionId: 4564, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-BPL25', name: 'Bodo Parja Bible', abbr: 'BPL25', nativeName: 'Bodo Parja Bible', languageCode: 'brx', languageName: 'Bodo', languageNative: 'बड़ो', source: 'youversion', youversionId: 2777, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-SANBU', name: 'Sanskrit Bible (NT) in Burmese Script', abbr: 'SANBU', nativeName: 'သတျဝေဒး၊', languageCode: 'my', languageName: 'Burmese', languageNative: 'မြန်မာ', source: 'youversion', youversionId: 2158, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-cmoK', name: 'Central Mnong (Khmer)', abbr: 'cmoK', nativeName: 'Central Mnong', languageCode: 'km', languageName: 'Khmer', languageNative: 'ខ្មែរ', source: 'youversion', youversionId: 1758, attribution: 'YouVersion', publicDomain: true },
  { id: 'YV-TRV', name: 'Sri Lankan Easy Tamil Translation 2021', abbr: 'TRV', nativeName: 'Sri Lankan Tamil', languageCode: 'si', languageName: 'Sinhala', languageNative: 'සිංහල', source: 'youversion', youversionId: 3281, attribution: 'YouVersion', publicDomain: false },
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
