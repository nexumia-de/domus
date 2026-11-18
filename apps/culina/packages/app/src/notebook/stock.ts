// What is there: reads of the stock cache, and the writes of ticking, unticking, editing and
// using up. Ticking writes an item with nothing but `id` and `ref`; everything else is added later.
// A record is changed on a copy of the stored one, so fields of another app (`x-...`) survive.
import type { ComponentRef } from '@culina/engine';
import type { Result } from '../store/types';
import type { StockRecord } from '../records';
import { removeRecord, saveRecord } from './actions';
import { getIngredient } from './read';
import { newId } from './ids';
import { state } from './state';
import { headOfFamily, versionRecord } from './versions';

/** Every item, in store order. */
export const listStock = (): readonly StockRecord[] => state.stock;

export const getStockItem = (id: string): StockRecord | undefined =>
  state.stock.find((s) => s.id === id);

/** A component is one thing in every version: its family. */
const keyOf = (ref: ComponentRef): string =>
  ref.kind === 'ingredient'
    ? `ingredient:${ref.id}`
    : `component:${versionRecord('components', ref.id)?.version.family ?? ref.id}`;

/** The items of one ingredient or component (more than one when batches are kept apart). */
export const stockOf = (ref: ComponentRef): StockRecord[] =>
  state.stock.filter((s) => keyOf(s.ref) === keyOf(ref));

/** The name an item is shown by; undefined when the ingredient or component is no longer there. */
export const stockName = (item: { ref: ComponentRef }): string | undefined =>
  item.ref.kind === 'ingredient'
    ? getIngredient(item.ref.id)?.name
    : headOfFamily('components', item.ref.id)?.name;

/** Ticks: says that this is there, with nothing else. Does nothing if it already is. */
export const tick = async (
  ref: ComponentRef,
  always = false,
): Promise<Result<{ items: StockRecord[] }>> => {
  const there = stockOf(ref);
  if (there.length > 0) return { ok: true, items: there };
  const item: StockRecord = { id: newId(), ref, ...(always ? { always: true } : {}) };
  const done = await saveRecord('stock', item);
  return done.ok ? { ok: true, items: [item] } : done;
};

/** Unticks: removes every item of the ingredient or component; the result carries them for Undo. */
export const untick = async (ref: ComponentRef): Promise<Result<{ removed: StockRecord[] }>> =>
  removeItems(stockOf(ref));

export const removeStockItem = async (id: string): Promise<Result<{ removed: StockRecord[] }>> =>
  removeItems(state.stock.filter((s) => s.id === id));

const removeItems = async (items: StockRecord[]): Promise<Result<{ removed: StockRecord[] }>> => {
  const removed: StockRecord[] = [];
  for (const item of items) {
    const done = await removeRecord('stock', item.id);
    if (!done.ok) return done;
    removed.push(item);
  }
  return { ok: true, removed };
};

/** Puts removed items back (Undo). */
export const restoreStock = async (items: readonly StockRecord[]): Promise<Result> => {
  for (const item of items) {
    const done = await saveRecord('stock', item);
    if (!done.ok) return done;
  }
  return { ok: true };
};

/** Stores a changed item (the caller built it from the stored record). */
export const saveStockItem = (item: StockRecord): Promise<Result> => saveRecord('stock', item);
