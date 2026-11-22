// What the stock screens read from the notebook: names and recorded shelf lives.
import type { ComponentRef, ShelfLifeEntry } from '@culina/engine';
import { getIngredient, headOfFamily, stockName } from '../../notebook';
import type { StockLookup } from '../../stock/rows';

/**
 * The recorded shelf life: of an ingredient per state and place, of a component per place (what its
 * current version says under `keeps`).
 */
export const shelfLifeOf = (ref: ComponentRef): readonly ShelfLifeEntry[] =>
  ref.kind === 'ingredient'
    ? (getIngredient(ref.id)?.shelfLife ?? []).map((s) => ({
        state: s.state,
        storage: s.storage,
        days: s.days,
      }))
    : (headOfFamily('components', ref.id)?.keeps ?? []).map((k) => ({
        storage: k.storage,
        days: k.days,
      }));

export const stockLookup: StockLookup = {
  name: (ref) => stockName({ ref }),
  shelfLife: shelfLifeOf,
};
