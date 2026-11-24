// All the names an ingredient record can be found by: its canonical English `name` and, per
// language, the `names` entries (a name and aliases). One predicate for every search over records
// (the picker's catalogue section now; the import matcher and the stock entry later). Pure.

import type { Lang } from '@culina/engine';

/** The language entries of a record, as the ingredient schema defines them. */
export type NamesByLanguage = Record<string, { name: string; aliases?: string[]; source?: string }>;

export interface Named {
  name: string;
  names?: NamesByLanguage;
  /** The name a cook writes for a catalogue entry, where the catalogue's own reads like its database. */
  'x-kitchen'?: { en: string; de: string };
}

/**
 * The name to show: the kitchen name in the language when the record has one ("Olive oil" for
 * "Oil, olive, salad or cooking"); else the German name when the language is German and the
 * record has one; else the canonical name.
 */
export const displayName = (record: Named, lang: Lang): string =>
  record['x-kitchen']?.[lang] ??
  (lang === 'de' ? (record.names?.['de']?.name ?? record.name) : record.name);

/** One name of a record: the language tag (`en` for the canonical name) and the text. */
export interface NameOf {
  lang: string;
  name: string;
}

/**
 * Text as compared in a search: lower case, accents and umlauts dropped (a -> a, o -> o), sharp s
 * as ss, so "kase" finds "Käse" and "strasse" finds "Straße". Used on both sides.
 */
export const fold = (text: string): string =>
  text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase().trim();

/** Every name of the record, the canonical English one first, then each language's name and aliases. */
export const searchableNames = (record: Named): NameOf[] => {
  const all: NameOf[] = [{ lang: 'en', name: record.name }];
  const kitchen = record['x-kitchen'];
  if (kitchen !== undefined)
    all.push({ lang: 'en', name: kitchen.en }, { lang: 'de', name: kitchen.de });
  for (const lang of Object.keys(record.names ?? {}).sort()) {
    const entry = record.names?.[lang];
    if (entry === undefined) continue;
    all.push({ lang, name: entry.name }, ...(entry.aliases ?? []).map((name) => ({ lang, name })));
  }
  return all;
};

/** The names of the record that contain the text (folded), in `searchableNames` order. */
export const matchingNames = (record: Named, text: string): NameOf[] => {
  const needle = fold(text);
  if (needle === '') return [];
  return searchableNames(record).filter((n) => fold(n.name).includes(needle));
};

/** Whether any name of the record contains the text. An empty text matches nothing. */
export const matchesAnyName = (record: Named, text: string): boolean =>
  matchingNames(record, text).length > 0;

/** Whether any name of the record starts with the text. */
export const startsWithAnyName = (record: Named, text: string): boolean => {
  const needle = fold(text);
  return needle !== '' && searchableNames(record).some((n) => fold(n.name).startsWith(needle));
};

/**
 * The name to show beside the English one when the record was found through another language:
 * the first matching name of a language other than English, and only when the English name does
 * not match itself. Undefined when the canonical name matches or nothing matches.
 */
export const foundThrough = (record: Named, text: string): NameOf | undefined => {
  const hits = matchingNames(record, text);
  return hits.some((n) => n.lang === 'en') ? undefined : hits[0];
};
