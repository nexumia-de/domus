// The staples the Stock screen offers to tick as always there: table salt and black pepper, the two
// catalogue foods the shipped dishes ask for most (salt in 33 lines, black pepper in 13, counted on
// 2026-11-21) and that a kitchen keeps without thinking of them. Nothing is assumed: they count as
// there only once ticked. Water is no staple here: the finder treats it as the kitchen's.
import type { StockRecord } from '../records';

export interface Staple {
  /** Catalogue id. */
  id: string;
}

export const STAPLES: readonly Staple[] = [{ id: 'fdc-173468' }, { id: 'fdc-170931' }];

/** The staples with no stock item yet, in the order of `STAPLES`. */
export const missingStaples = (stock: readonly StockRecord[]): Staple[] =>
  STAPLES.filter((s) => !stock.some((i) => i.ref.kind === 'ingredient' && i.ref.id === s.id));
