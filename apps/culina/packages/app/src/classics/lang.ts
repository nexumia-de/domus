// The one language setting: follow the device, English or German. It decides the app's own texts
// (strings.ts), the names of ingredients and the content of dishes and notes. Kept in localStorage
// like the theme.
import type { Lang } from '@culina/engine';
import { browserStore, type KeyValueStore } from '../prefs';

export const LANG_KEY = 'culina.lang';
export const LANG_CHOICES = ['device', 'en', 'de'] as const;
export type LangChoice = (typeof LANG_CHOICES)[number];

/** Anything that is not a known choice means Follow device. */
export const parseLangChoice = (value: unknown): LangChoice =>
  LANG_CHOICES.find((choice) => choice === value) ?? 'device';

export const readLangChoice = (store: KeyValueStore | null): LangChoice => {
  try {
    return parseLangChoice(store?.getItem(LANG_KEY));
  } catch {
    return 'device';
  }
};

/** False when the choice could not be kept (no storage, quota, private mode). */
export const writeLangChoice = (store: KeyValueStore | null, choice: LangChoice): boolean => {
  try {
    if (!store) return false;
    store.setItem(LANG_KEY, choice);
    return true;
  } catch {
    return false;
  }
};

/**
 * The language to show.
 *
 * @param choice - The stored choice.
 * @param device - The device's languages, most wanted first (`navigator.languages`).
 * @returns German when chosen or when the device's first language is German; otherwise English.
 */
export const resolveLang = (choice: LangChoice, device: readonly string[]): Lang => {
  if (choice !== 'device') return choice;
  const first = device[0]?.toLowerCase() ?? 'en';
  return first === 'de' || first.startsWith('de-') ? 'de' : 'en';
};

/** The language to show now. */
export const currentLang = (): Lang =>
  resolveLang(readLangChoice(browserStore()), globalThis.navigator?.languages ?? []);
