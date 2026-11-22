// The language of the app, read once when it starts: the one setting decides the app's own texts,
// the names of ingredients, the content of dishes and the decimal mark. A change of the setting
// reloads the app, so this never changes while the app runs.
import type { Lang } from '@culina/engine';
import { currentLang } from '../classics/lang';

export const appLang: Lang = currentLang();

/** The decimal mark of a language: a comma in German, a point in English. */
export const withDecimalMark = (text: string, lang: Lang): string =>
  lang === 'de' ? text.replace(/(\d)\.(\d)/g, '$1,$2') : text;

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * A stored date (`2026-11-18`, or the start of a timestamp) in the language's form: `18.11.2026` in
 * German, `18 Nov 2026` in English. Written out by hand, not with `Intl`, so it is the same in every
 * browser and in the tests. Anything that does not start with a date is shown as it is.
 */
export const formatDate = (iso: string, lang: Lang = appLang): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match === null) return iso;
  const [, year = '', month = '', day = ''] = match;
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return iso;
  return lang === 'de' ? `${day}.${month}.${year}` : `${d} ${MONTHS_EN[m - 1] ?? month} ${year}`;
};
