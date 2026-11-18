// Needed against known stock for one line. Every unit conversion goes through the engine's
// `convert`; only amounts already in the line's unit are added and compared here.
import { convert } from '../amounts/convert';
import type { Amount } from '../amounts/types';
import type { Context, Item } from './context';

export interface Compared {
  status: 'have' | 'have-amount-unknown' | 'short';
  /** The items the line would use: as many, earliest use-by first, as cover the need. */
  used: Item[];
  /** Known stock in the line's unit; absent when none is known. */
  have?: Amount;
}

const EPSILON = 1e-9;

/**
 * @param ctx - The context (facts for conversion).
 * @param items - Items that fit the line, earliest use-by first; not empty.
 * @param need - The needed amount; absent: nothing to compare.
 * @param askedId - The ingredient the line names, whose facts convert an item without its own.
 * @returns `have` when the known amounts cover the need (or there is nothing to compare),
 *   `have-amount-unknown` when they do not but an item has no amount or none that converts,
 *   `short` otherwise.
 */
export function compareStock(
  ctx: Context,
  items: readonly Item[],
  need: Amount | undefined,
  askedId: string,
): Compared {
  const first = items[0] as Item;
  if (need === undefined) return { status: 'have', used: [first] };
  let sum = 0;
  let known = false;
  let unknown = false;
  const used: Item[] = [];
  for (const item of items) {
    const converted =
      item.amount === undefined
        ? undefined
        : convert(item.amount, need.unit, ctx.facts[item.refId] ?? ctx.facts[askedId]);
    if (converted?.ok !== true) {
      unknown = true;
      continue;
    }
    known = true;
    if (sum < need.value - EPSILON) {
      used.push(item);
      sum += converted.amount.value;
    }
  }
  const have = known ? { value: sum, unit: need.unit } : undefined;
  const base = have === undefined ? {} : { have };
  if (sum >= need.value - EPSILON) return { status: 'have', used, ...base };
  return { status: unknown ? 'have-amount-unknown' : 'short', used: [...items], ...base };
}
