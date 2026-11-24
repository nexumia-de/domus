// The day each own dish was last cooked, by the key of its entry in the lists (`own:<head id>`), for
// the rows of Cook's list and its order "Not cooked for long" (browse/list-view.ts). The day is kept
// per family (notebook/cooked.ts); the lists show the head of each family.
import { entryKey } from '../browse/entry';
import type { DishRecord } from '../records';

/**
 * @param heads - The head of every dish family (`listDishes()`).
 * @param byFamily - The kept day per family (`cookedByFamily()`).
 */
export const cookedDaysByKey = (
  heads: readonly DishRecord[],
  byFamily: ReadonlyMap<string, string>,
): Map<string, string> =>
  new Map(
    heads.flatMap((dish) => {
      const day = byFamily.get(dish.version.family);
      return day === undefined ? [] : [[entryKey('own', dish.id), day] as const];
    }),
  );
