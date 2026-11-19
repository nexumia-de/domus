/**
 * Every visible text of the app. Screens and the shell import `strings` from here only.
 *
 * English is the canonical set (`strings-app.ts` and its siblings); German is `de/`, with the same
 * keys and signatures. The set is chosen once when the app starts, from the language setting
 * (`classics/lang.ts`); a change of the setting reloads the app (docs/behaviour.md).
 */
import { currentLang } from './classics/lang';
import { appStringsDe } from './de/strings-app';
import { appStrings } from './strings-app';

export type Strings = typeof appStrings;

export const stringsEn: Strings = appStrings;
export const stringsDe: Strings = appStringsDe;

export const strings: Strings = currentLang() === 'de' ? stringsDe : stringsEn;
