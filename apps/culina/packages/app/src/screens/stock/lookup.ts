// What the stock screens read from the notebook: names and recorded shelf lives.
import type { ComponentRef, ShelfLifeEntry } from '@culina/engine';
import { getIngredient, stockName } from '../../notebook';
import type { StockLookup } from '../../stock/rows';

/** The recorded shelf life of an ingredient; a component has none of its own. */
export const shelfLifeOf = (ref: ComponentRef): readonly ShelfLifeEntry[] =>
  ref.kind === 'ingredient'
    ? (getIngredient(ref.id)?.shelfLife ?? []).map((s) => ({
        state: s.state,
        storage: s.storage,
        days: s.days,
      }))
    : [];

export const stockLookup: StockLookup = {
  name: (ref) => stockName({ ref }),
  shelfLife: shelfLifeOf,
};
