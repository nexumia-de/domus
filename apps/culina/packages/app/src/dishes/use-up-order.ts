// Cook's order "Use up first" (docs/decisions/cook-screen.md): asked of the finder as it is, own
// dishes and shipped ones together, at the finder's wide threshold, so that every dish that uses a
// stock item is placed, whether or not every line is there; "Only with what I have" narrows the
// list separately (./ready-now.ts). The order and the days are the engine's (`useUpMarks` over its
// one ranking); nothing is judged here.
import { dishEntriesByKey } from '../browse/entries';
import { WIDE } from '../cook/classic-finder';
import { shippedNow } from '../cook/entries';
import type { DishEntry } from '../browse/entry';
import { find, type Found, type Shipped } from '../cook/finder';
import type { CookSource } from '../cook/input';
import { useUpMarks, type UseUpMark } from '../cook/one-list';
import { cookToday, notebookSource } from '../cook/source';

export interface UseUpNow {
  /**
   * False when the finder could not read the notebook (a broken ingredient tree): then nothing is
   * known about the dates, and the list says nothing about them.
   */
  ok: boolean;
  /** The dishes that use a dated item, by entry key. */
  marks: ReadonlyMap<string, UseUpMark>;
  /** True when some stock item has a use-by date. */
  anyDated: boolean;
  /** The name of a stock item, for the line under a dish. */
  itemName(itemId: string): string;
}

/** The order from the finder's answer; pure. */
export const useUpOf = (found: Found): UseUpNow => {
  if (!found.ok) return { ok: false, marks: new Map(), anyDated: false, itemName: (id) => id };
  return {
    ok: true,
    marks: useUpMarks(found.dishes),
    anyDated: found.useUpFirst.length > 0,
    itemName(itemId) {
      const ref = found.look.itemRef(itemId);
      return ref === undefined ? itemId : found.look.name(ref);
    },
  };
};

/**
 * The quiet note above the list in the order "Use up first": "no item has a use-by date" only
 * when the finder could read the stock and found none; nothing when it could not read it.
 */
export const useUpNote = (useUp: UseUpNow | undefined): 'no-dates' | undefined =>
  useUp !== undefined && useUp.ok && !useUp.anyDated ? 'no-dates' : undefined;

/**
 * The order for a source, a day, the dish entries by key and the shipped side; pure. The web app
 * asks it of the notebook (`useUpNow`), the native Linux app of its stock with no notebook.
 */
export const useUpFrom = (
  source: CookSource,
  today: string,
  entries: ReadonlyMap<string, DishEntry>,
  shipped: Shipped,
): UseUpNow => useUpOf(find(source, today, { lacking: WIDE }, { entries, shipped }));

export const useUpNow = (): UseUpNow =>
  useUpFrom(notebookSource(), cookToday(), dishEntriesByKey(), shippedNow());
