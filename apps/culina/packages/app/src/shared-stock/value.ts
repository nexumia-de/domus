// The one boundary between Culina's stock items and the records of the shared collection `stock`
// of a space (docs/decisions/stock-in-spaces.md, docs/data-model.md#stock-item). Pure: no store,
// no clock. The record's key is the id of the thing (an ingredient id, or a component's family id);
// its value is `{ present, ... }` as Mixtura writes it, with Culina's optional fields added. The
// first item is the record's top-level fields, further items are objects in `batches`.
//
// Names: in memory `preparedOn` and `useBy`, in the record `openedOn` and `bestBefore` (Mixtura's
// fields, the same meaning); `amount`, `state`, `always`, `storage` and `note` keep their names.
import type { Amount, ComponentRef, FoodState, StockItem, StoragePlace } from '@culina/engine';
import { AMOUNT_UNITS } from '../editor/units';

/** The name of the collection, the same in every app. */
export const STOCK = 'stock';

/** The fields of a value that Culina reads and writes; every other field is another app's. */
export const OWN_FIELDS: ReadonlySet<string> = new Set([
  'present',
  'amount',
  'state',
  'always',
  'storage',
  'openedOn',
  'bestBefore',
  'note',
  'batches',
]);

/** What an item says besides what it is: everything of `StockItem` but `id` and `ref`. */
export type Detail = Omit<StockItem, 'id' | 'ref'>;

/** A stored value as an object; a value that is no object has no fields. */
export type Value = Record<string, unknown>;

const isObject = (value: unknown): value is Value =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A stock value: an object with a boolean `present`. Anything else is not shown and left alone. */
export const isStockValue = (value: unknown): value is Value & { present: boolean } =>
  isObject(value) && typeof value.present === 'boolean';

// ---- ids of items: the key, and the place among the record's items ----

const SEPARATOR = '~';

/** The id of an item in memory: the key for the first, `key~n` for the n-th batch. */
export const itemId = (key: string, index: number): string =>
  index === 0 ? key : `${key}${SEPARATOR}${index}`;

/** The key and place an item id stands for. */
export const placeOf = (id: string): { key: string; index: number } => {
  const at = id.lastIndexOf(SEPARATOR);
  const index = at < 0 ? 0 : Number(id.slice(at + 1));
  return Number.isInteger(index) && index > 0
    ? { key: id.slice(0, at), index }
    : { key: id, index: 0 };
};

// ---- reading: stored fields to an item's detail ----

const DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const STATES: readonly FoodState[] = ['raw', 'cooked', 'prepared'];
const PLACES: readonly StoragePlace[] = ['pantry', 'fridge', 'freezer'];

const amountOf = (value: unknown): Amount | undefined =>
  isObject(value) &&
  typeof value.value === 'number' &&
  Number.isFinite(value.value) &&
  value.value > 0 &&
  AMOUNT_UNITS.some((unit) => unit === value.unit)
    ? ({ value: value.value, unit: value.unit } as Amount)
    : undefined;

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | undefined =>
  list.find((entry) => entry === value);

/**
 * The detail one stored object says. A field that does not fit (a malformed date, an unknown
 * state) is not shown; it stays stored until Culina writes that item.
 */
export const detailOf = (fields: Value): Detail => {
  const amount = amountOf(fields.amount);
  const state = oneOf(STATES, fields.state);
  const storage = oneOf(PLACES, fields.storage);
  const { openedOn, bestBefore, note, always } = fields;
  return {
    ...(amount === undefined ? {} : { amount }),
    ...(state === undefined ? {} : { state }),
    ...(always === true ? { always: true } : {}),
    ...(typeof openedOn === 'string' && DATE.test(openedOn) ? { preparedOn: openedOn } : {}),
    ...(typeof bestBefore === 'string' && DATE.test(bestBefore) ? { useBy: bestBefore } : {}),
    ...(storage === undefined ? {} : { storage }),
    ...(typeof note === 'string' && note.trim() !== '' ? { note } : {}),
  };
};

/** The objects of the record's items in order: the value itself, then every batch object. */
const storedItems = (value: Value): Value[] => [
  value,
  ...(Array.isArray(value.batches) ? value.batches.filter(isObject) : []),
];

/** The details of a value's items; none when it is no stock value or says "not there". */
export const detailsOf = (value: unknown): Detail[] =>
  isStockValue(value) && value.present ? storedItems(value).map(detailOf) : [];

/** The items of one record as Culina shows them, with their ids. */
export const itemsOf = (key: string, ref: ComponentRef, value: unknown): StockItem[] =>
  detailsOf(value).map((detail, index) => ({ id: itemId(key, index), ref, ...detail }));

// ---- writing: an item's detail to stored fields ----

/** The stored fields of one item's detail, under the shared names. */
export const fieldsOf = (detail: Detail): Value => ({
  ...(detail.amount === undefined ? {} : { amount: { ...detail.amount } }),
  ...(detail.state === undefined ? {} : { state: detail.state }),
  ...(detail.always === true ? { always: true } : {}),
  ...(detail.storage === undefined ? {} : { storage: detail.storage }),
  ...(detail.preparedOn === undefined ? {} : { openedOn: detail.preparedOn }),
  ...(detail.useBy === undefined ? {} : { bestBefore: detail.useBy }),
  ...(detail.note === undefined || detail.note.trim() === '' ? {} : { note: detail.note }),
});

/** The fields of a stored object that are not Culina's. */
export const foreignOf = (value: unknown): Value =>
  isObject(value)
    ? Object.fromEntries(Object.entries(value).filter(([field]) => !OWN_FIELDS.has(field)))
    : {};

/** The fields of a stored object that are Culina's. */
export const ownOf = (value: unknown): Value =>
  isObject(value)
    ? Object.fromEntries(Object.entries(value).filter(([field]) => OWN_FIELDS.has(field)))
    : {};

/** One item to write, and the place among the stored items whose foreign fields it keeps. */
export interface Written {
  detail: Detail;
  /** The index of the stored item it was; absent for a new item. */
  from?: number;
}

const foreignOfBatch = (value: Value, from: number | undefined): Value => {
  if (from === undefined || from === 0) return {};
  const batch = storedItems(value)[from];
  return batch === undefined ? {} : foreignOf(batch);
};

/**
 * The value to store: Culina's fields from `items`, every other field from `stored` as it is
 * now. No items writes `present: false` and none of Culina's detail; the record stays.
 * A batch keeps its own foreign fields; one that becomes the first item adds them to the top
 * level where the top level has no field of that name.
 */
export const valueWith = (stored: unknown, items: readonly Written[]): Value => {
  const base = isObject(stored) ? stored : {};
  const out: Value = { present: items.length > 0, ...foreignOf(base) };
  const [first, ...rest] = items;
  if (first !== undefined) {
    for (const [field, v] of Object.entries(foreignOfBatch(base, first.from))) {
      if (!(field in out)) out[field] = v;
    }
    Object.assign(out, fieldsOf(first.detail));
  }
  if (rest.length > 0) {
    out.batches = rest.map((item) => ({
      ...foreignOfBatch(base, item.from),
      ...fieldsOf(item.detail),
    }));
  }
  return out;
};
