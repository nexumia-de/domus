// The sync cycle of one place against a storage adapter and a cipher: no
// network, no clock, no store, deterministic given its inputs. Docs:
// docs/sync-cycle.md.

import {
  planSync,
  type Cipher,
  type Envelope,
  type LocalPlaceState,
  type Place,
  type StorageAdapter,
} from '@mixtura/engine';
import type { Ingredient, StockRecord } from '../store';
import { readPlaceFile, writePlaceFile } from './file';
import type { MergedState, SyncOutcome } from './outcome';
import {
  entitiesToIngredients,
  entityRecords,
  recordsToRows,
  rowsToRecords,
  type StockValue,
} from './records';

export const DEFAULT_ATTEMPTS = 4;

export interface SyncInput {
  /** The local state, read by the caller. */
  place: Place;
  rows: StockRecord[];
  ingredients: Ingredient[];
  adapter: StorageAdapter;
  cipher: Cipher;
  path: string;
  passphrase: string;
  /** The last envelope seen, to reuse its salt. */
  previous?: Envelope | undefined;
  /** Cycles to run (a write is followed by a checking cycle); default 4. */
  maxAttempts?: number | undefined;
  /** Merge without writing (the first step of a move). */
  readOnly?: boolean | undefined;
}

export type PlaceState = LocalPlaceState<StockValue, Ingredient>;

export const stateOf = (
  place: Place,
  rows: readonly StockRecord[],
  ingredients: readonly Ingredient[],
): PlaceState => ({
  place,
  records: rowsToRecords(rows),
  entities: entityRecords(rows, ingredients),
});

export const mergedOf = (state: PlaceState): MergedState => ({
  place: state.place,
  rows: recordsToRows(state.place.id, state.records),
  entities: entitiesToIngredients(state.entities),
});

/** Merges the local state with the file and writes the result when the file lacks something. */
export async function syncPlace(input: SyncInput): Promise<SyncOutcome> {
  const { adapter, cipher, path, passphrase } = input;
  const attempts = input.maxAttempts ?? DEFAULT_ATTEMPTS;
  let state = stateOf(input.place, input.rows, input.ingredients);
  let changedLocal = false;
  let wrote = false;
  let seen = input.previous;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const read = await readPlaceFile(adapter, cipher, path, passphrase);
    if (!read.ok)
      return { kind: 'failed', reason: read.reason, code: read.code, detail: read.detail };
    const plan = planSync(state, read.missing ? undefined : read.document);
    if ('error' in plan) return { kind: 'failed', reason: 'other-place' };
    state = plan.local;
    changedLocal ||= plan.localChanged;
    if (!read.missing) seen = read.envelope;
    const file = read.missing ? {} : { etag: read.etag, envelope: read.envelope };
    if (plan.moved)
      return { kind: 'moved', moved: plan.moved, changedLocal, ...mergedOf(state), ...file };
    if (!plan.write || input.readOnly)
      return { kind: 'ok', changedLocal, wrote, ...mergedOf(state), ...file };
    const written = await writePlaceFile(
      adapter,
      cipher,
      path,
      passphrase,
      plan.write,
      read.missing ? null : read.etag,
      seen,
    );
    if (written.ok) wrote = true;
    else if (written.reason !== 'conflict')
      return { kind: 'failed', reason: written.reason, detail: written.detail };
    // A conflict or a written file: read again; the next cycle merges from the merged state and checks the file.
  }
  return { kind: 'failed', reason: 'gave-up' };
}
