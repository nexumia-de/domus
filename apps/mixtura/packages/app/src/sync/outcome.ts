// The result types of the sync cycle (docs/sync-cycle.md#outcomes).

import type { AdapterFailure, Envelope, Place } from '@mixtura/engine';
import type { Ingredient, StockRecord } from '../store';

/** The merged local state a cycle hands back; the caller stores it with `applyOutcome`. */
export interface MergedState {
  place: Place;
  rows: StockRecord[];
  /** The custom ingredients of the merged document; the caller adds those it does not have. */
  entities: Ingredient[];
}

export type FailureReason =
  | AdapterFailure
  /** The passphrase is wrong or the file was changed; nothing is written. */
  | 'wrong-passphrase'
  /** Envelope or document not readable or newer than this build; `code` says which. */
  | 'unsupported-file'
  /** The file holds another place. */
  | 'other-place'
  /** Every attempt met a conflict or a change. */
  | 'gave-up'
  /** The cipher failed in a way that is neither of the above. */
  | 'internal';

export interface SyncFailure {
  kind: 'failed';
  reason: FailureReason;
  /** For `unsupported-file`: the error code of the envelope or the document. */
  code?: string;
  detail?: string;
}

export interface SyncOk extends MergedState {
  kind: 'ok';
  /** The merge differs from the local state the cycle started with. */
  changedLocal: boolean;
  /** The file was written by this cycle. */
  wrote: boolean;
  /** Of the last read; absent only when no file exists and nothing was written. */
  etag?: string;
  envelope?: Envelope;
}

/** The file says the place moved; the merged state is returned, nothing was written. */
export interface SyncMoved extends MergedState {
  kind: 'moved';
  moved: { at: string; note?: string };
  changedLocal: boolean;
  etag?: string;
  envelope?: Envelope;
}

export type SyncOutcome = SyncOk | SyncMoved | SyncFailure;
