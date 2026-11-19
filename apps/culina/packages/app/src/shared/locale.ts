// The language of the app, read once when it starts: the one setting decides the app's own texts,
// the names of ingredients, the content of dishes and the decimal mark. A change of the setting
// reloads the app, so this never changes while the app runs.
import type { Lang } from '@culina/engine';
import { currentLang } from '../classics/lang';

export const appLang: Lang = currentLang();

/** The decimal mark of a language: a comma in German, a point in English. */
export const withDecimalMark = (text: string, lang: Lang): string =>
  lang === 'de' ? text.replace(/(\d)\.(\d)/g, '$1,$2') : text;
