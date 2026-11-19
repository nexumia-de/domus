// The bilingual text of shipped content: English canonical and German, both required.

/** The two languages of shipped content. */
export type Lang = 'en' | 'de';

/** Every language, English first. */
export const LANGS: readonly Lang[] = ['en', 'de'];

/** A text in both languages. */
export interface I18nText {
  en: string;
  de: string;
}

/**
 * Whether a value is a text in both languages, each a string with at least one
 * character that is not white space.
 *
 * @param value - Any value, for example from a JSON file.
 * @returns True when `en` and `de` are both present and not empty.
 */
export function isI18nText(value: unknown): value is I18nText {
  if (typeof value !== 'object' || value === null) return false;
  const text = value as Record<string, unknown>;
  return LANGS.every((lang) => typeof text[lang] === 'string' && text[lang].trim().length > 0);
}

/**
 * The text in one language.
 *
 * @param text - A text in both languages.
 * @param lang - The language wanted.
 * @returns The string of that language.
 */
export function pickText(text: I18nText, lang: Lang): string {
  return text[lang];
}
