/** The theme preference, kept in localStorage under one key. Storage may be missing or throw. */
export const THEME_KEY = 'culina.theme';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AttributeTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/** Anything that is not a known theme means Follow system. */
export const parseTheme = (value: unknown): Theme =>
  THEMES.find((theme) => theme === value) ?? 'system';

export const browserStore = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const readTheme = (store: KeyValueStore | null): Theme => {
  try {
    return parseTheme(store?.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
};

/** False when the choice could not be kept (no storage, quota, private mode). */
export const writeTheme = (store: KeyValueStore | null, theme: Theme): boolean => {
  try {
    if (!store) return false;
    store.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
};

/** Follow system removes the attribute, so the media query in tokens.css decides. */
export const applyTheme = (root: AttributeTarget, theme: Theme): void => {
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
};
