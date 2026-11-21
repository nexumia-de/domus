// The rows of the stock list: name, the detail that was entered, and the remaining days from the
// engine. Pure: names, shelf lives and today come in. Sorted by use by where one is known (the
// nearest first), then by name; an item with no use-by date follows the ones that have one.
import { stockExpiry } from '@culina/engine';
import type { ComponentRef, ShelfLifeEntry, StockExpiry } from '@culina/engine';
import { strings } from '../strings';
import { writtenAmount } from '../shared/units';

const t = strings.stock;

export interface StockRow {
  id: string;
  name: string;
  /** False when the ingredient or component is no longer in the notebook. */
  known: boolean;
  always: boolean;
  /** Only what was entered: amount, state. */
  detail: string[];
  /** "2 days left", "use by today", "past use by"; undefined without a use-by date. */
  remaining: string | undefined;
  daysLeft: number | undefined;
}

export interface StockLookup {
  name(ref: ComponentRef): string | undefined;
  shelfLife(ref: ComponentRef): readonly ShelfLifeEntry[];
}

type Item = Parameters<typeof stockExpiry>[0] & {
  id: string;
  ref: ComponentRef;
  amount?: { value: number; unit: string };
  state?: keyof typeof t.state;
  always?: boolean;
};

/** The remaining days in neutral words; not colour, not a verdict. */
export const remainingText = (expiry: StockExpiry): string | undefined => {
  if (expiry.status === 'none' || expiry.daysLeft === undefined) return undefined;
  if (expiry.daysLeft < 0) return t.pastUseBy;
  return expiry.daysLeft === 0 ? t.useByToday : t.daysLeft(expiry.daysLeft);
};

/** An amount in stock with its unit's name: "2 Stück". */
export const amountText = (amount: { value: number; unit: string }): string =>
  writtenAmount(amount);

export const stockRows = (
  items: readonly Item[],
  today: string,
  lookup: StockLookup,
): StockRow[] => {
  const rows = items.map((item): StockRow => {
    const name = lookup.name(item.ref);
    const e = stockExpiry(item, today, lookup.shelfLife(item.ref));
    const expiry: StockExpiry = e.ok ? e : { status: 'none' };
    return {
      id: item.id,
      name: name ?? t.gone,
      known: name !== undefined,
      always: item.always === true,
      detail: [
        ...(item.amount ? [amountText(item.amount)] : []),
        ...(item.state ? [t.state[item.state]] : []),
      ],
      remaining: remainingText(expiry),
      daysLeft: expiry.daysLeft,
    };
  });
  return rows.sort(
    (a, b) =>
      (a.daysLeft === undefined ? 1 : 0) - (b.daysLeft === undefined ? 1 : 0) ||
      (a.daysLeft ?? 0) - (b.daysLeft ?? 0) ||
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) ||
      (a.id < b.id ? -1 : 1),
  );
};
