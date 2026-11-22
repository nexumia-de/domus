// The device's language for apps whose shared code reads `navigator.languages` when its modules
// load (Culina's web code chooses its texts that way). Import this module FIRST in an app's
// `main.ts`: a bundle evaluates its modules in import order, and GJS has no `navigator`.
import GLib from 'gi://GLib';

/** The language names of the locale, most wanted first, as `de-DE`; `C` and `POSIX` are left out. */
export function deviceLanguages(): string[] {
  return GLib.get_language_names()
    .filter((name: string) => name !== 'C' && name !== 'POSIX')
    .map((name: string) => name.replace(/[.@].*$/, '').replace('_', '-'));
}

/** German when the device's first language is German, otherwise English. */
export function deviceLang(): 'de' | 'en' {
  return /^de([-_]|$)/.test(deviceLanguages()[0] ?? '') ? 'de' : 'en';
}

const languages = deviceLanguages();
if (!('navigator' in globalThis)) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { languages, language: languages[0] ?? 'en' },
    configurable: true,
  });
}
