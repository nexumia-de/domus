// Language and theme, kept in localStorage like the sibling apps. Storage may be missing
// or throw; the page then follows the device. Nothing else is kept there: no secret, no
// token, no space.
export const THEME_KEY = 'domus.theme';
export const LANG_KEY = 'domus.lang';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const LANG_CHOICES = ['device', 'en', 'de'] as const;
export type LangChoice = (typeof LANG_CHOICES)[number];
export type Lang = 'en' | 'de';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const browserStore = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const read = (store: KeyValueStore | null, key: string): string | null => {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

/** False when the choice could not be kept (no storage, quota, private mode). */
const write = (store: KeyValueStore | null, key: string, value: string): boolean => {
  try {
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const parseTheme = (value: unknown): Theme =>
  THEMES.find((theme) => theme === value) ?? 'system';
export const readTheme = (store: KeyValueStore | null): Theme => parseTheme(read(store, THEME_KEY));
export const writeTheme = (store: KeyValueStore | null, theme: Theme): boolean =>
  write(store, THEME_KEY, theme);

/** Follow system removes the attribute, so the media query in tokens.css decides. */
export const applyTheme = (
  root: { setAttribute(n: string, v: string): void; removeAttribute(n: string): void },
  theme: Theme,
): void => {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
};

export const parseLangChoice = (value: unknown): LangChoice =>
  LANG_CHOICES.find((choice) => choice === value) ?? 'device';
export const readLangChoice = (store: KeyValueStore | null): LangChoice =>
  parseLangChoice(read(store, LANG_KEY));
export const writeLangChoice = (store: KeyValueStore | null, choice: LangChoice): boolean =>
  write(store, LANG_KEY, choice);

/** German when chosen, or when the device's first language is German; otherwise English. */
export const resolveLang = (choice: LangChoice, device: readonly string[]): Lang => {
  if (choice !== 'device') return choice;
  const first = device[0]?.toLowerCase() ?? 'en';
  return first === 'de' || first.startsWith('de-') ? 'de' : 'en';
};
