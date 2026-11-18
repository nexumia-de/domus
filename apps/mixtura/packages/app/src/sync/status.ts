// What a place's state line says, derived from its binding, the scheduler's
// bookkeeping and the network; nothing here is stored (docs/screens-sync.md#states).

import type { SyncFailure } from './outcome';

/** The problems a state line names; `lastError` of the binding is mapped to one of these. */
export type SyncProblem =
  | 'wrong-passphrase'
  | 'unauthorised'
  | 'unreachable'
  | 'blocked'
  | 'etag-not-exposed'
  | 'not-found'
  | 'server'
  | 'moved'
  | 'newer-version'
  | 'unsupported-file'
  | 'other-place'
  | 'gave-up'
  | 'internal';

export type PlaceStatus =
  /** No binding: the place never causes a request. */
  | { kind: 'local' }
  | { kind: 'syncing' }
  /** Offline with something to send, or never synced: nothing is tried until the browser is online. */
  | { kind: 'waiting' }
  /** A local change is queued for the next cycle. */
  | { kind: 'pending' }
  | { kind: 'synced'; at: string }
  | { kind: 'problem'; problem: SyncProblem };

export interface StatusInput {
  bound: boolean;
  lastSyncAt?: string | undefined;
  lastError?: string | undefined;
  /** A cycle for the place is running now. */
  running: boolean;
  /** A change waits for its cycle (debounce running, or not sent yet). */
  pending: boolean;
  online: boolean;
}

/** The problem a stored `lastError` (`reason` or `reason:code`) stands for. */
export function problemOf(lastError: string): SyncProblem {
  const [reason = '', code] = lastError.split(':');
  switch (reason) {
    case 'wrong-passphrase':
    case 'unauthorised':
    case 'unreachable':
    case 'not-found':
    case 'server':
    case 'moved':
    case 'other-place':
    case 'gave-up':
      return reason;
    case 'blocked':
      return code === 'etag-not-exposed' ? 'etag-not-exposed' : 'blocked';
    case 'unsupported-file':
      return code === 'newer-version' ? 'newer-version' : 'unsupported-file';
    default:
      return 'internal';
  }
}

/** The problem a failed cycle stands for (the same mapping `lastError` gets through `nextState`). */
export function problemOfFailure(failure: SyncFailure): SyncProblem {
  const code = failure.code ?? (failure.detail === 'etag-not-exposed' ? failure.detail : undefined);
  return problemOf(code ? `${failure.reason}:${code}` : failure.reason);
}

/** Order: running, moved, waiting for a connection, queued change, last problem, in sync. */
export function placeStatus(input: StatusInput): PlaceStatus {
  if (!input.bound) return { kind: 'local' };
  if (input.running) return { kind: 'syncing' };
  if (input.lastError === 'moved') return { kind: 'problem', problem: 'moved' };
  const neverSynced = input.lastSyncAt === undefined;
  if (!input.online && (input.pending || neverSynced)) return { kind: 'waiting' };
  if (input.pending) return { kind: 'pending' };
  if (input.lastError) return { kind: 'problem', problem: problemOf(input.lastError) };
  if (neverSynced) return { kind: 'pending' };
  return { kind: 'synced', at: input.lastSyncAt as string };
}
