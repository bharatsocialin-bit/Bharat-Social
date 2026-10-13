import type { QuizQuestion, QuizOption, Language, QuizCategory, QuizAchievement } from '@/lib/types';

/**
 * Returns the question text in the requested language.
 * Falls back to English if no translation is available.
 * NEVER silently substitutes an unrelated translation.
 */
export function getQuestionText(question: QuizQuestion, lang: Language): string {
  if (lang !== 'en') {
    const translated = question.translations?.[lang];
    if (translated) return translated;
  }
  return question.text;
}

/** Returns the option text in the requested language, falling back to English. */
export function getOptionText(option: QuizOption, lang: Language): string {
  if (lang !== 'en') {
    const translated = option.translations?.[lang];
    if (translated) return translated;
  }
  return option.text;
}

/** Returns the explanation in the requested language, falling back to English. */
export function getExplanationText(question: QuizQuestion, lang: Language): string {
  if (lang !== 'en') {
    const translated = question.explanationTranslations?.[lang];
    if (translated) return translated;
  }
  return question.explanation;
}

/** Returns the category label in the requested language, falling back to English. */
export function getCategoryLabel(category: QuizCategory, lang: Language): string {
  if (lang !== 'en') {
    const translated = category.labels?.[lang];
    if (translated) return translated;
  }
  return category.label;
}

/** Returns the achievement name in the requested language, falling back to English. */
export function getAchievementName(ach: QuizAchievement, lang: Language): string {
  if (lang !== 'en') {
    const translated = ach.nameTranslations?.[lang];
    if (translated) return translated;
  }
  return ach.name;
}

/** Returns the achievement description in the requested language, falling back to English. */
export function getAchievementDescription(ach: QuizAchievement, lang: Language): string {
  if (lang !== 'en') {
    const translated = ach.descriptionTranslations?.[lang];
    if (translated) return translated;
  }
  return ach.description;
}
