// The one accessor for the entries of every dish (./entry.ts), cached. Deriving the entries of the
// 48 shipped dishes takes milliseconds, and the list, the finder and the random pick read them on
// every filter change. Each half is kept until something it is derived from changes; what it is
// derived from is compared by identity, because the caches replace, never change, what they hold:
// - the shipped entries: the shipped content (replaced when classics.json loads), the catalogue
//   (replaced when its names load), the notebook's ingredients (which come first in the lookup of
//   an ingredient) and the content language;
// - the notebook's entries: its ingredients, components and dishes (every write of the notebook
//   cache replaces the list it changes) and the catalogue.
// Nothing here is written by a screen; the arrays handed out must not be changed.
import type { Classic, Lang } from '@culina/engine';
import { characterLookup } from '../characters/lookup';
import { dishClassics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { catalogueEntries } from '../classics/names';
import { allVersions, listDishes, listIngredients, notebook } from '../notebook';
import { entryOfClassic, entryOfDish } from './entry';
import type { DishEntry } from './entry';

/** How often each half was derived (for the tests of the cache). */
export const derivations = { own: 0, shipped: 0 };

/** A value kept while every key is the same (by identity) as when it was made. */
const keptWhile = <T>(keys: () => readonly unknown[], make: () => T): (() => T) => {
  let last: { keys: readonly unknown[]; value: T } | undefined;
  return () => {
    const now = keys();
    if (last === undefined || now.some((k, i) => k !== last?.keys[i])) {
      last = { keys: now, value: make() };
    }
    return last.value;
  };
};

const shippedEntries = keptWhile(
  () => [dishClassics(), catalogueEntries(), listIngredients(), currentLang()],
  (): readonly DishEntry[] => {
    derivations.shipped++;
    const lang: Lang = currentLang();
    return dishClassics().map((c: Classic) => entryOfClassic(c, characterLookup, lang));
  },
);

const ownEntries = keptWhile(
  () => [listIngredients(), allVersions('components'), allVersions('dishes'), catalogueEntries()],
  (): readonly DishEntry[] => {
    derivations.own++;
    const nb = notebook();
    return listDishes().map((d) => entryOfDish(nb, d, characterLookup));
  },
);

const both = keptWhile(
  () => [ownEntries(), shippedEntries()],
  () => {
    const list: readonly DishEntry[] = [...ownEntries(), ...shippedEntries()];
    return { list, byKey: new Map(list.map((e) => [e.key, e])) as ReadonlyMap<string, DishEntry> };
  },
);

/** Every dish as an entry: the notebook's first (its heads, in its order), then the shipped ones. */
export const dishEntries = (): readonly DishEntry[] => both().list;

/** The same entries by key (`own:<id>`, `shipped:<id>`). */
export const dishEntriesByKey = (): ReadonlyMap<string, DishEntry> => both().byKey;
