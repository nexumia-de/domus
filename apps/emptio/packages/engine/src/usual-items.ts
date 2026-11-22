// Rule 4, step 3 (docs/engine-rules.md#4-category-of-a-new-entry): the category a name gets
// from the usual things a household buys. The list is data of the engine
// (docs/categories.md#usual-items) and names its source and licence.
import data from '../data/usual-items.json';
import { sortKey } from './sort-key';

export const USUAL_ITEMS_SOURCE: string = data.source;

/** The names of the list by category, as written in the data. */
export const USUAL_ITEMS: Readonly<
  Record<string, { de: readonly string[]; en: readonly string[] }>
> = data.items;

/** What a plural or a case adds to a word: "Tomate" is found in "Tomaten", "egg" in "eggs". */
const ENDINGS = new Set(['', 'e', 'n', 's', 'en', 'es', 'er', 'nen']);
/** A shorter head would be found in words it has nothing to do with ("Tee" in "Kaffee"). */
const MIN_HEAD = 4;

const words = (key: string): string[] => key.split(/[^\p{L}\p{N}]+/u).filter((w) => w !== '');

/** Key of a name as the rule compares it: the sort key, its words joined by one space. */
const itemKey = (name: string): string => words(sortKey(name)).join(' ');

const byKey = new Map<string, string>();
for (const [categoryId, names] of Object.entries(USUAL_ITEMS)) {
  for (const name of [...names.de, ...names.en]) {
    const key = itemKey(name);
    if (!byKey.has(key)) byKey.set(key, categoryId);
  }
}
/** The one-word names, the longest first, so that "Schwein" is found before "Wein". */
const heads = [...byKey.keys()]
  .filter((key) => !key.includes(' ') && key.length >= MIN_HEAD)
  .sort((a, b) => b.length - a.length || (a < b ? -1 : 1));

function ofWord(word: string): string | undefined {
  for (const head of heads) {
    if (word.startsWith(head) && ENDINGS.has(word.slice(head.length))) return byKey.get(head);
  }
  for (const head of heads) {
    if (word.endsWith(head)) return byKey.get(head);
  }
  return undefined;
}

/**
 * The category of the usual item a name means, if any. Tried in this order: the longest run of
 * the name's words that is an item (the last such run on a tie); then, from the last word to
 * the first, the item a word is a plural of, or the longest item a word ends with (the head of
 * a German compound: "Vollmilch" is milk).
 */
export function usualCategory(name: string): string | undefined {
  const all = words(sortKey(name));
  for (let length = all.length; length >= 1; length -= 1) {
    for (let start = all.length - length; start >= 0; start -= 1) {
      const hit = byKey.get(all.slice(start, start + length).join(' '));
      if (hit !== undefined) return hit;
    }
  }
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const hit = ofWord(all[i] ?? '');
    if (hit !== undefined) return hit;
  }
  return undefined;
}
