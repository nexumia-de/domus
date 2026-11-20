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

/** The filters of the finder, kept in localStorage like the theme: the role and how much may lack. */
export const COOK_KEY = 'culina.cook';

export const MAX_LACKING = 3;

export interface CookFilters {
  /** Only what covers this role; undefined: any. */
  role?: string;
  /** Lines that may be lacking, 0 to `MAX_LACKING`. */
  lacking: number;
  /** Classics of this country only; undefined: all four. */
  country?: ClassicCountry;
  /** True: only classics without meat and fish. */
  meatFree?: true;
}

/** The countries of the shipped classics (the filter's choices). */
export const CLASSIC_COUNTRIES = ['de', 'it', 'fr', 'es'] as const;
export type ClassicCountry = (typeof CLASSIC_COUNTRIES)[number];

export const DEFAULT_COOK_FILTERS: CookFilters = { lacking: 1 };

/** Anything unreadable is the default; a value out of range is the default for that field. */
export const parseCookFilters = (value: unknown): CookFilters => {
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return { ...DEFAULT_COOK_FILTERS };
    }
  }
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_COOK_FILTERS };
  const { role, lacking, country, meatFree } = raw as {
    role?: unknown;
    lacking?: unknown;
    country?: unknown;
    meatFree?: unknown;
  };
  const chosen = CLASSIC_COUNTRIES.find((c) => c === country);
  return {
    ...(typeof role === 'string' && role !== '' ? { role } : {}),
    ...(chosen === undefined ? {} : { country: chosen }),
    ...(meatFree === true ? { meatFree: true as const } : {}),
    lacking:
      typeof lacking === 'number' &&
      Number.isInteger(lacking) &&
      lacking >= 0 &&
      lacking <= MAX_LACKING
        ? lacking
        : DEFAULT_COOK_FILTERS.lacking,
  };
};

export const readCookFilters = (store: KeyValueStore | null): CookFilters => {
  try {
    return parseCookFilters(store?.getItem(COOK_KEY));
  } catch {
    return { ...DEFAULT_COOK_FILTERS };
  }
};

/** False when the choice could not be kept (no storage, quota, private mode). */
export const writeCookFilters = (store: KeyValueStore | null, filters: CookFilters): boolean => {
  try {
    if (!store) return false;
    store.setItem(COOK_KEY, JSON.stringify(filters));
    return true;
  } catch {
    return false;
  }
};

/** Which space's stock this device shows (docs/decisions/stock-in-spaces.md); a space id. */
export const SPACE_KEY = 'culina.space';

export const readSpaceChoice = (store: KeyValueStore | null): string | null => {
  try {
    return store?.getItem(SPACE_KEY) ?? null;
  } catch {
    return null;
  }
};

/** False when the choice could not be kept (no storage, quota, private mode). */
export const writeSpaceChoice = (store: KeyValueStore | null, id: string): boolean => {
  try {
    if (!store) return false;
    store.setItem(SPACE_KEY, id);
    return true;
  } catch {
    return false;
  }
};
