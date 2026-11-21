// "Surprise me with a dish": one whole dish by chance, of either origin, among the entries that
// pass the one filter (browse/filter.ts) and, when asked, among those the stock allows now. Pure:
// the entries, what the stock allows and the random number come in as arguments.
import type { DishEntry } from '../browse/entry';
import { matchesFilter, type DishFilter } from '../browse/filter';
import { pickOne } from './pick';

/** The entries the roll is among, in the order given. */
export const dishPool = (
  entries: readonly DishEntry[],
  filter: DishFilter,
  allowed?: ReadonlySet<string>,
): DishEntry[] =>
  entries.filter((e) => matchesFilter(e, filter) && (allowed === undefined || allowed.has(e.key)));

/**
 * One entry of the pool for a number from 0 to 1, equal shares; `not` (an entry key) is left out
 * when there is another, so rolling again gives another dish.
 */
export const surpriseDish = (
  pool: readonly DishEntry[],
  random: number,
  not?: string,
): DishEntry | undefined =>
  pickOne(pool, random, not === undefined ? undefined : (e) => e.key === not);
