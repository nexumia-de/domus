// Cook's order "Use up first" (docs/decisions/cook-screen.md): asked of the finder as it is, own
// dishes and shipped ones together, at the finder's wide threshold, so that every dish that uses a
// stock item is placed, whether or not every line is there; "Only with what I have" narrows the
// list separately (./ready-now.ts). The order and the days are the engine's (`useUpMarks` over its
// one ranking); nothing is judged here.
import { dishEntriesByKey } from '../browse/entries';
import { WIDE } from '../cook/classic-finder';
import { shippedNow } from '../cook/entries';
import { find, type Found } from '../cook/finder';
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

export const useUpNow = (): UseUpNow =>
  useUpOf(
    find(
      notebookSource(),
      cookToday(),
      { lacking: WIDE },
      { entries: dishEntriesByKey(), shipped: shippedNow() },
    ),
  );
