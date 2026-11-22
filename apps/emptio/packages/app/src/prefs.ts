// What this device remembers outside the list: language, theme and which
// space's list is shown. Kept in localStorage, which may be missing or throw;
// the app then follows the device. No secret and no token is kept here.
export const KEYS = {
  theme: 'emptio.theme',
  lang: 'emptio.lang',
  space: 'emptio.space',
  /** The urgencies shown on the list, as "now,soon" (the choice of this device only). */
  shown: 'emptio.shown',
  sort: 'emptio.sort',
} as const;

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const LANG_CHOICES = ['device', 'en', 'de'] as const;
export type LangChoice = (typeof LANG_CHOICES)[number];
export type Lang = 'en' | 'de';

export interface Prefs {
  get(key: string): string | null;
  /** False when the value could not be kept. */
  set(key: string, value: string): boolean;
}

/** The prefs on a key-value storage; `null` (no storage) reads nothing and keeps nothing. */
export function prefsOn(storage: Pick<Storage, 'getItem' | 'setItem'> | null): Prefs {
  return {
    get(key) {
      try {
        return storage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        if (!storage) return false;
        storage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function browserPrefs(): Prefs {
  try {
    return prefsOn(globalThis.localStorage ?? null);
  } catch {
    return prefsOn(null);
  }
}

export const themeOf = (value: unknown): Theme => THEMES.find((t) => t === value) ?? 'system';
export const langChoiceOf = (value: unknown): LangChoice =>
  LANG_CHOICES.find((c) => c === value) ?? 'device';

/** German when chosen or when the device's first language is German; otherwise English. */
export function langFor(choice: LangChoice, device: readonly string[]): Lang {
  if (choice !== 'device') return choice;
  const first = device[0]?.toLowerCase() ?? 'en';
  return first === 'de' || first.startsWith('de-') ? 'de' : 'en';
}

/** `system` removes the attribute, so the media query of the stylesheet decides. */
export function applyTheme(
  root: { setAttribute(n: string, v: string): void; removeAttribute(n: string): void },
  theme: Theme,
): void {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
