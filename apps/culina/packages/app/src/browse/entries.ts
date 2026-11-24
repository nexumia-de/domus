// The one accessor for the entries of every dish (./entry.ts), cached. Deriving the entries of the
// 48 shipped dishes takes milliseconds, and the list, the finder and the random pick read them on
// every filter change. Each half is kept until something it is derived from changes; what it is
// derived from is compared by identity, because the caches replace, never change, what they hold:
// - the shipped entries: the shipped content (replaced when classics.json loads) with the frames as
//   the cook chose them (`dishClassics`: a new array after a choice, every other dish the same
//   object), the catalogue (replaced when its names load), the notebook's ingredients (which come
//   first in the lookup of an ingredient) and the content language. While the last three are the
//   same, a dish whose classic is the same object keeps its entry: a choice derives one entry anew,
//   not 121;
// - the notebook's entries: its ingredients, components and dishes (every write of the notebook
//   cache replaces the list it changes) and the catalogue.
// Nothing here is written by a screen; the arrays handed out must not be changed.
import type { Classic, Lang } from '@culina/engine';
import { characterLookup } from '../characters/lookup';
import { classics, dishClassics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { catalogueEntries } from '../classics/names';
import { allVersions, listDishes, listIngredients, notebook } from '../notebook';
import { entryOfClassic, entryOfDish } from './entry';
import type { DishEntry } from './entry';

/** How often each half was derived (for the tests of the cache). */
export const derivations = { own: 0, shipped: 0 };
/** How many entries of shipped dishes were made one by one (for the tests of the cache). */
export const shippedEntriesMade = { count: 0 };

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

/** The entries of the last derivation by classic, with what else they were derived from. */
let byClassic: { context: readonly unknown[]; entries: Map<Classic, DishEntry> } | undefined;

const shippedEntries = keptWhile(
  () => [dishClassics(), catalogueEntries(), listIngredients(), currentLang()],
  (): readonly DishEntry[] => {
    derivations.shipped++;
    const lang: Lang = currentLang();
    const context = [catalogueEntries(), listIngredients(), lang];
    const kept =
      byClassic !== undefined && context.every((k, i) => k === byClassic?.context[i])
        ? byClassic.entries
        : undefined;
    const entries = new Map<Classic, DishEntry>();
    // A frame's parts are read from the file as shipped, with the alternatives of its slots.
    const shipped = new Map(classics().map((c) => [c.id, c]));
    const list = dishClassics().map((c: Classic) => {
      let entry = kept?.get(c);
      if (entry === undefined) {
        shippedEntriesMade.count++;
        entry = entryOfClassic(c, characterLookup, lang, shipped.get(c.id) ?? c);
      }
      entries.set(c, entry);
      return entry;
    });
    byClassic = { context, entries };
    return list;
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
