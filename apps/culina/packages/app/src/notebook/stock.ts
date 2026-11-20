// What is there: the items of the shared collection `stock` of the used space, as Culina shows
// them, and the writes of ticking, unticking, editing, adding a batch and removing. Every write is
// worked out from the records as stored at that moment (src/shared-stock/edits.ts), so fields and
// items of another app or device survive. A record is shown when its key is an ingredient of the
// notebook, else the family of a component; any other record is left untouched.
import type { ComponentRef } from '@culina/engine';
import {
  addEdit,
  removeEdit,
  restoreEdit,
  saveEdit,
  tickEdit,
  untickEdit,
  type Decision,
  type StockUndo,
  type SyncRecord,
} from '../shared-stock/edits';
import { itemsOf, type Detail } from '../shared-stock/value';
import { fail, type Result } from '../store/types';
import type { StockRecord } from '../records';
import { appLang } from '../shared/locale';
import { displayName } from '../shared/names';
import { getIngredient } from './read';
import { state } from './state';
import { headOfFamily, versionRecord } from './versions';

export type { StockUndo };

/** The key of a thing in the collection: an ingredient's id, a component's family id. */
export const stockKeyOf = (ref: ComponentRef): string =>
  ref.kind === 'ingredient'
    ? ref.id
    : (versionRecord('components', ref.id)?.version.family ?? ref.id);

/** What a key stands for here: an ingredient, else a component family; undefined: not shown. */
export const resolveStockKey = (key: string): ComponentRef | undefined => {
  if (getIngredient(key) !== undefined) return { kind: 'ingredient', id: key };
  const head = headOfFamily('components', key);
  return head !== undefined && head.version.family === key
    ? { kind: 'component', id: key }
    : undefined;
};

const itemsOfRecords = (records: readonly SyncRecord[]): StockRecord[] =>
  records.flatMap((record) => {
    if (record.deleted === true) return [];
    const ref = resolveStockKey(record.key);
    return ref === undefined ? [] : itemsOf(record.key, ref, record.value);
  });

/** How many records Culina shows (live, present, known); what the choice of space weighs. */
export const shownCount = (records: readonly SyncRecord[]): number =>
  new Set(itemsOfRecords(records).map((item) => stockKeyOf(item.ref))).size;

// The items are worked out again only when the records or the notebook changed.
let memo: { records: unknown; ingredients: unknown; components: unknown; items: StockRecord[] } = {
  records: undefined,
  ingredients: undefined,
  components: undefined,
  items: [],
};

/** Every item of the used space, in record order (the screens sort). */
export const listStock = (): readonly StockRecord[] => {
  const records = state.stockSpace?.state().records ?? [];
  if (
    memo.records !== records ||
    memo.ingredients !== state.ingredients ||
    memo.components !== state.components
  ) {
    memo = {
      records,
      ingredients: state.ingredients,
      components: state.components,
      items: itemsOfRecords(records),
    };
  }
  return memo.items;
};

export const getStockItem = (id: string): StockRecord | undefined =>
  listStock().find((s) => s.id === id);

/** The items of one ingredient or component (more than one when batches are kept apart). */
export const stockOf = (ref: ComponentRef): StockRecord[] => {
  const key = stockKeyOf(ref);
  return listStock().filter((s) => stockKeyOf(s.ref) === key);
};

const ingredientNameOrUndefined = (id: string): string | undefined => {
  const record = getIngredient(id);
  return record === undefined ? undefined : displayName(record, appLang);
};

/** The name an item is shown by; undefined when the ingredient or component is no longer there. */
export const stockName = (item: { ref: ComponentRef }): string | undefined =>
  item.ref.kind === 'ingredient'
    ? ingredientNameOrUndefined(item.ref.id)
    : headOfFamily('components', item.ref.id)?.name;

/** Runs a decision on the used space; a gone item is `not-found`. */
const change = async <T>(
  decide: (records: readonly SyncRecord[]) => Decision<T>,
): Promise<Result<{ outcome: T }>> => {
  const space = state.stockSpace;
  if (space === undefined) return fail({ code: 'unavailable' });
  const done = await space.change(decide);
  if (done.ok) return { ok: true, outcome: done.outcome };
  return fail({ code: done.why === 'gone' ? 'not-found' : 'unavailable' });
};

const detailOfItem = (item: StockRecord): Detail => {
  const detail: Partial<StockRecord> = { ...item };
  delete detail.id;
  delete detail.ref;
  return detail;
};

/** Ticks: says that this is there, with nothing else. Does nothing if it already is. */
export const tick = async (ref: ComponentRef, always = false): Promise<Result> => {
  const done = await change((records) => tickEdit(records, stockKeyOf(ref), always));
  return done.ok ? { ok: true } : done;
};

/** Unticks: `present: false` for the thing; the result carries what Undo needs. */
export const untick = async (ref: ComponentRef): Promise<Result<{ removed: StockUndo }>> => {
  const done = await change((records) => untickEdit(records, stockKeyOf(ref)));
  return done.ok ? { ok: true, removed: done.outcome } : done;
};

/** Removes one item; the last one of a thing unticks it. */
export const removeStockItem = async (id: string): Promise<Result<{ removed: StockUndo }>> => {
  const done = await change((records) => removeEdit(records, id));
  return done.ok ? { ok: true, removed: done.outcome } : done;
};

/** Undo of an untick or a removal: Culina's fields as they were, other fields as they are. */
export const restoreStock = async (undo: StockUndo): Promise<Result> => {
  const done = await change((records) => restoreEdit(records, undo));
  return done.ok ? { ok: true } : done;
};

/** Stores the detail of an item the caller built from the shown one. */
export const saveStockItem = async (item: StockRecord): Promise<Result> => {
  const done = await change((records) => saveEdit(records, item.id, detailOfItem(item)));
  return done.ok ? { ok: true } : done;
};

/** Adds an item (a new batch of a made component); gives the id it is shown by. */
export const addStockItem = async (
  ref: ComponentRef,
  detail: Detail,
): Promise<Result<{ id: string }>> => {
  const done = await change((records) => addEdit(records, stockKeyOf(ref), detail));
  return done.ok ? { ok: true, id: done.outcome } : done;
};
