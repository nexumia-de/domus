// The language of the app's own texts, chosen once when the app starts; a change of the setting
// reloads the page (display.ts), so this never changes while the app runs.
import { browserStore, readLangChoice, resolveLang, type Lang } from './prefs';
import { stringsEn, type Strings } from './strings';
import { stringsDe } from './strings-de';

export const currentLang = (): Lang =>
  resolveLang(readLangChoice(browserStore()), globalThis.navigator?.languages ?? []);

export const stringsFor = (lang: Lang): Strings => (lang === 'de' ? stringsDe : stringsEn);
