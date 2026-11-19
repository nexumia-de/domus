// Moving a place to other storage: merge the old file one last time, write the
// merge to the new location, then leave the "moved" marker in the old file.
// Docs: docs/sync-cycle.md#moving-a-place.

import {
  DOCUMENT_FORMAT,
  DOCUMENT_VERSION,
  planSync,
  type Cipher,
  type Envelope,
  type Place,
  type StorageAdapter,
} from '@mixtura/engine';
import type { Ingredient, StockRecord } from '../store';
import { mergedOf, stateOf, syncPlace, DEFAULT_ATTEMPTS, type PlaceState } from './cycle';
import { readPlaceFile, writePlaceFile } from './file';
import type { SyncFailure, SyncMoved, SyncOk } from './outcome';

export interface Location {
  adapter: StorageAdapter;
  path: string;
  passphrase: string;
  previous?: Envelope | undefined;
}

export interface MoveInput {
  place: Place;
  rows: StockRecord[];
  ingredients: Ingredient[];
  from: Location;
  to: Location;
  cipher: Cipher;
  /** The instant written into the marker. */
  at: string;
  maxAttempts?: number | undefined;
}

/** `ok`: the new file holds the merge; `etag` and `envelope` are those of the new file. */
export interface MoveOk extends SyncOk {
  /** The marker is in the old file; false when that write failed (the move itself is done). */
  marked: boolean;
}

/** `stage` says which location failed; with `new` the old file is untouched. */
export type MoveFailure = SyncFailure & { stage: 'old' | 'new' };

export type MoveOutcome = MoveOk | SyncMoved | MoveFailure;

/** Writes the old file with the marker; `changed` when the old file held something the state lacks. */
async function markOld(
  input: MoveInput,
  state: PlaceState,
): Promise<{ marked: boolean; state: PlaceState; changed: boolean }> {
  const { adapter, path, passphrase, previous } = input.from;
  const read = await readPlaceFile(adapter, input.cipher, path, passphrase);
  if (!read.ok) return { marked: false, state, changed: false };
  const plan = planSync(state, read.missing ? undefined : read.document);
  if ('error' in plan || plan.moved) return { marked: false, state, changed: false };
  if (plan.localChanged) return { marked: false, state: plan.local, changed: true };
  const { place, records, entities } = plan.local;
  const document = {
    format: DOCUMENT_FORMAT,
    version: DOCUMENT_VERSION,
    place,
    records,
    entities,
    moved: { at: input.at },
  } as const;
  const written = await writePlaceFile(
    adapter,
    input.cipher,
    path,
    passphrase,
    document,
    read.missing ? null : read.etag,
    read.missing ? previous : read.envelope,
  );
  return { marked: written.ok, state, changed: false };
}

export async function movePlace(input: MoveInput): Promise<MoveOutcome> {
  const { cipher, from, to } = input;
  const attempts = input.maxAttempts ?? DEFAULT_ATTEMPTS;
  const old = await syncPlace({
    place: input.place,
    rows: input.rows,
    ingredients: input.ingredients,
    cipher,
    ...from,
    readOnly: true,
  });
  if (old.kind === 'failed') return { ...old, stage: 'old' };
  if (old.kind === 'moved') return old;
  let changedLocal = old.changedLocal;
  let state = stateOf(old.place, old.rows, old.entities);
  let marked = false;
  let target: SyncOk | undefined;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const fresh = await syncPlace({
      place: state.place,
      rows: mergedOf(state).rows,
      ingredients: mergedOf(state).entities,
      cipher,
      ...to,
    });
    if (fresh.kind === 'failed') return { ...fresh, stage: 'new' };
    if (fresh.kind === 'moved') return fresh;
    target = fresh;
    changedLocal ||= fresh.changedLocal;
    state = stateOf(fresh.place, fresh.rows, fresh.entities);
    const mark = await markOld(input, state);
    state = mark.state;
    marked = mark.marked;
    if (!mark.changed) break;
    changedLocal = true;
  }
  if (!target) return { kind: 'failed', reason: 'gave-up', stage: 'new' };
  return { ...target, ...mergedOf(state), changedLocal, marked };
}
