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
//   cache replaces the list it changes), the catalogue, and the shipped content (a copy kept from a
//   frame reads its frame mark and parts from there).
// - the favourite marks (`marked`): a copy of each marked dish's entry, so that a mark does not
//   derive any entry again.
// Nothing here is written by a screen; the arrays handed out must not be changed.
import type { Classic, Lang } from '@culina/engine';
import { characterLookup } from '../characters/lookup';
import { classics, dishClassics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { catalogueEntries } from '../classics/names';
import { allVersions, listDishes, listIngredients, markedDishes, notebook } from '../notebook';
import { state } from '../notebook/state';
import { entryOfClassic, entryOfDish, withKeptOrigin } from './entry';
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
  // The shipped content too: a copy kept from a frame is a frame only once its shipped dish is read.
  () => [
    listIngredients(),
    allVersions('components'),
    allVersions('dishes'),
    catalogueEntries(),
    classics(),
  ],
  (): readonly DishEntry[] => {
    derivations.own++;
    const nb = notebook();
    const versions = allVersions('dishes');
    return listDishes().map((d) => entryOfDish(nb, withKeptOrigin(d, versions), characterLookup));
  },
);

/**
 * Both halves with the favourite mark added: a copy of an entry whose dish is marked, the other
 * entries as they are. The marks are read from the notebook's favourites, which the cache replaces
 * on every write, so a mark made or taken back derives this layer anew and no entry below it.
 */
const marked = keptWhile(
  () => [ownEntries(), shippedEntries(), state.favourites, state.dishes],
  (): readonly DishEntry[] => {
    const { own, shipped } = markedDishes();
    const familyOfHead = new Map(listDishes().map((d) => [d.id, d.version.family]));
    return [...ownEntries(), ...shippedEntries()].map((e) => {
      const on = e.origin === 'own' ? own.has(familyOfHead.get(e.id) ?? '') : shipped.has(e.id);
      return on ? { ...e, favourite: true as const } : e;
    });
  },
);

const both = keptWhile(
  () => [marked()],
  () => {
    const list = marked();
    return { list, byKey: new Map(list.map((e) => [e.key, e])) as ReadonlyMap<string, DishEntry> };
  },
);

/** Every dish as an entry: the notebook's first (its heads, in its order), then the shipped ones. */
export const dishEntries = (): readonly DishEntry[] => both().list;

/** The same entries by key (`own:<id>`, `shipped:<id>`). */
export const dishEntriesByKey = (): ReadonlyMap<string, DishEntry> => both().byKey;
