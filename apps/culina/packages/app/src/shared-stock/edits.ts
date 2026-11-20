// What a person's stock action changes in the shared collection, decided from the records as they
// are stored at that moment (inside the host's `localChange`, one transaction), never from an
// earlier read: a field or item another app or device wrote since the screen was drawn survives.
// Pure: the records come in, the change and what the screen needs go out.
import type { CollectionState, LocalEdit } from '@nexumia-de/hospes';
import {
  detailsOf,
  foreignOf,
  isStockValue,
  itemId,
  ownOf,
  placeOf,
  valueWith,
  type Detail,
  type Value,
  type Written,
} from './value';

/** One record of a collection, as the host stores it. */
export type SyncRecord = CollectionState['records'][number];

/** What Undo needs: the key and its value before the change (undefined: there was no record). */
export interface StockUndo {
  key: string;
  before: unknown;
}

/** An edit and what it gives the caller; `missing` when the item is no longer there. */
export type Decision<T> = { edit: LocalEdit; outcome: T } | { edit: LocalEdit; missing: true };

const NOTHING: LocalEdit = {};

/** The live value of a key, or undefined (no record, or a removal marker). */
export const liveValue = (records: readonly SyncRecord[], key: string): unknown =>
  records.find((r) => r.key === key && r.deleted !== true)?.value;

const put = (key: string, value: Value): LocalEdit => ({ put: [{ key, value }] });

/** The items stored now, each keeping the place it came from. */
const writtenOf = (value: unknown): Written[] =>
  detailsOf(value).map((detail, from) => ({ detail, from }));

/**
 * Ticks: the thing is there, with nothing else (`always` when asked). A record that already says
 * present is left as it is. Culina's detail of an earlier tick is not taken over.
 */
export const tickEdit = (
  records: readonly SyncRecord[],
  key: string,
  always: boolean,
): Decision<StockUndo | undefined> => {
  const before = liveValue(records, key);
  if (isStockValue(before) && before.present) return { edit: NOTHING, outcome: undefined };
  return {
    edit: put(key, valueWith(before, [{ detail: always ? { always: true } : {} }])),
    outcome: { key, before },
  };
};

/** Unticks: `present: false`, Culina's detail and batches gone, every other field kept. */
export const untickEdit = (records: readonly SyncRecord[], key: string): Decision<StockUndo> => {
  const before = liveValue(records, key);
  if (!isStockValue(before) || !before.present) return { edit: NOTHING, missing: true };
  return { edit: put(key, valueWith(before, [])), outcome: { key, before } };
};

/** Replaces the detail of one item; the others and every foreign field stay. */
export const saveEdit = (
  records: readonly SyncRecord[],
  id: string,
  detail: Detail,
): Decision<string> => {
  const { key, index } = placeOf(id);
  const before = liveValue(records, key);
  const items = writtenOf(before);
  if (index >= items.length) return { edit: NOTHING, missing: true };
  const next = items.map((item, i) => (i === index ? { detail, from: i } : item));
  return { edit: put(key, valueWith(before, next)), outcome: id };
};

/** Adds an item (a new batch); the first item of a thing that is not there. Gives its id. */
export const addEdit = (
  records: readonly SyncRecord[],
  key: string,
  detail: Detail,
): Decision<string> => {
  const before = liveValue(records, key);
  const items = [...writtenOf(before), { detail }];
  return { edit: put(key, valueWith(before, items)), outcome: itemId(key, items.length - 1) };
};

/** Removes one item; the last one gone writes `present: false` as an untick does. */
export const removeEdit = (records: readonly SyncRecord[], id: string): Decision<StockUndo> => {
  const { key, index } = placeOf(id);
  const before = liveValue(records, key);
  const items = writtenOf(before);
  if (index >= items.length) return { edit: NOTHING, missing: true };
  const rest = items.filter((_, i) => i !== index);
  return { edit: put(key, valueWith(before, rest)), outcome: { key, before } };
};

/**
 * Undo: Culina's fields as they were before, every other field as it is now. A record that did
 * not exist before Culina wrote it gets `present: false`, not a removal marker: another app may
 * have written to it meanwhile.
 */
export const restoreEdit = (records: readonly SyncRecord[], undo: StockUndo): Decision<true> => {
  const now = liveValue(records, undo.key);
  const own = undo.before === undefined ? { present: false } : ownOf(undo.before);
  const back = { ...foreignOf(now), ...own };
  return { edit: put(undo.key, back), outcome: true };
};
