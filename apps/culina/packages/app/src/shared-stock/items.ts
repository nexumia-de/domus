// The records of the shared collection `stock` as the items Culina shows. A record is shown when
// its key stands for something the caller knows (the notebook's ingredient or component family in
// the web app, the shipped catalogue's ingredient in the native app); any other record is left
// untouched and not shown. Pure: what a key stands for comes in.
import type { ComponentRef } from '@culina/engine';
import type { StockRecord } from '../records';
import type { SyncRecord } from './edits';
import { itemsOf } from './value';

/** What a key of the collection stands for here; undefined: the record is not shown. */
export type ResolveKey = (key: string) => ComponentRef | undefined;

/** The items of every live record that is present and known, in record order. */
export const itemsFromRecords = (
  records: readonly SyncRecord[],
  resolve: ResolveKey,
): StockRecord[] =>
  records.flatMap((record) => {
    if (record.deleted === true) return [];
    const ref = resolve(record.key);
    return ref === undefined ? [] : itemsOf(record.key, ref, record.value);
  });
