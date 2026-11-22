// Types of the stock module: the stored item (docs/data-model.md#stock-item) and the shapes
// of the derived results. Every fallible function returns a result union and never throws.
import type { Amount } from '../amounts/types';
import type { ComponentRef, FoodState } from '../components/types';

/**
 * What the user has. Presence is the whole item: `amount`, `state`, `preparedOn`, `useBy`
 * and `note` are optional detail. `always` marks something that counts as present until
 * it is unticked. Fields of other apps (`x-...`) are not typed here; an editor keeps them
 * by changing a copy of the stored record.
 */
export interface StockItem {
  id: string;
  ref: ComponentRef;
  amount?: Amount;
  state?: FoodState;
  always?: boolean;
  preparedOn?: string;
  useBy?: string;
  /** Where it lies: the shelf life of that place is the one that counts. */
  storage?: StoragePlace;
  note?: string;
}

/** The storage places of the ingredient schema. */
export type StoragePlace = 'pantry' | 'fridge' | 'freezer';

/**
 * One recorded shelf life: of an ingredient in a state (the part of `shelfLife` the stock rules
 * read), or of a component, which has no state of its own and so applies to its item in any state.
 */
export interface ShelfLifeEntry {
  state?: FoodState;
  storage: StoragePlace;
  days: number;
}

/**
 * True when a recorded shelf life applies to an item: its state is the item's (or it names none),
 * and its place is the item's (or the item names none).
 */
export const shelfLifeApplies = (
  entry: ShelfLifeEntry,
  item: Pick<StockItem, 'state' | 'storage'>,
): boolean =>
  (entry.state === undefined || entry.state === item.state) &&
  (item.storage === undefined || entry.storage === item.storage);

/** Where a use-by date comes from: the user's entry, or the recorded shelf life of the ingredient or component. */
export type ExpiryBasis = 'entered' | 'shelf-life';

/** `none`: no use-by date is known; the others as materia's `expiry`. */
export type StockStatus = 'none' | 'fresh' | 'use-soon' | 'past';

export interface StockExpiry {
  status: StockStatus;
  /** The last day within the shelf life. */
  useBy?: string;
  /** Days from today to `useBy`: 0 on the day itself, negative once past. */
  daysLeft?: number;
  basis?: ExpiryBasis;
}

export interface StockError {
  code: 'invalid-date';
  /** The offending input: `today`, `useBy` or `preparedOn`. */
  field: 'today' | 'useBy' | 'preparedOn';
}

export type StockExpiryResult = ({ ok: true } & StockExpiry) | { ok: false; error: StockError };

export interface UseBySuggestion {
  storage: StoragePlace;
  days: number;
  useBy: string;
}

export type SuggestionsResult =
  { ok: true; suggestions: UseBySuggestion[] } | { ok: false; error: StockError };
