// What the cook chose on a dish and keeps while moving between its screens: the fillings swapped
// for now, per dish version and slot. The dish screen writes them, the cook screen of the dish
// reads them. In memory only: a reload starts from the stored dish again, and nothing is stored.
import type { Swaps } from './alternatives';

const swaps = new Map<string, Map<number, string>>();
const NONE: Swaps = new Map();

export const swapsOf = (dishId: string): Swaps => swaps.get(dishId) ?? NONE;

/** Sets the filling of one slot for now. */
export const setSwap = (dishId: string, index: number, componentId: string): void => {
  const mine = swaps.get(dishId) ?? new Map<number, string>();
  mine.set(index, componentId);
  swaps.set(dishId, mine);
};

/** Back to the stored fillings. */
export const clearSwaps = (dishId: string): void => {
  swaps.delete(dishId);
};
