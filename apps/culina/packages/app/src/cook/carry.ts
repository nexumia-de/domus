// An older version kept a country and "without meat and fish" for the classics in the finder's
// own entry (`culina.cook`). They belong to the one dish filter now (`culina.dishes`): read once,
// carried over where the dish filter has no choice of its own for them, and taken out of the old
// entry, so that it is not carried again. Pure but for `carryOldCookChoices`, which takes a store.
import type { DishFilter } from '../browse/filter';
import { readDishFilter, writeDishFilter } from '../browse/filter';
import { COOK_KEY, oldCookChoices, parseCookFilters, writeCookFilters } from '../prefs';
import type { KeyValueStore, OldCookChoices } from '../prefs';

/**
 * The dish filter with the old choices carried in: the country as the cuisine, the meat choice as
 * is. A choice the dish filter already has wins; the old one is dropped.
 */
export const carried = (old: OldCookChoices, filter: DishFilter): DishFilter => ({
  ...filter,
  ...(old.country !== undefined && filter.cuisine === undefined ? { cuisine: old.country } : {}),
  ...(old.meatFree === true ? { meatFree: true as const } : {}),
});

/** True when the old entry still holds a country or a meat choice. */
export const hasOldChoices = (old: OldCookChoices): boolean =>
  old.country !== undefined || old.meatFree === true;

/**
 * Carries the old choices once. Nothing happens without them or without storage; a store that
 * throws is left as it is (the screen then works with what it can read).
 */
export const carryOldCookChoices = (store: KeyValueStore | null): void => {
  try {
    if (!store) return;
    const raw = store.getItem(COOK_KEY);
    const old = oldCookChoices(raw);
    if (!hasOldChoices(old)) return;
    if (!writeDishFilter(store, carried(old, readDishFilter(store)))) return;
    writeCookFilters(store, parseCookFilters(raw));
  } catch {
    // Private mode or a full store: the old entry stays and is simply not read.
  }
};
