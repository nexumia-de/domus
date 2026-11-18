// What the binding of a place keeps from a cycle. Pure; the cycle's triggers
// and the per-place display are issue #135. Docs: docs/sync-cycle.md#binding-fields.

import type { SyncOutcome } from './outcome';

/** The fields a cycle changes in a binding. */
export interface BindingState {
  /** The etag of the file as last read. */
  etag?: string | undefined;
  /** The instant of the last cycle that read the file. */
  lastSyncAt?: string | undefined;
  /** The reason of the last failure, `moved` for a moved place; absent after a success. */
  lastError?: string | undefined;
}

/**
 * The binding fields after a cycle. A failure keeps the etag and the last
 * success time and records its reason (with the code for an unsupported
 * file); a success clears the error; `moved` counts as a sync and says so.
 */
export function nextState(previous: BindingState, outcome: SyncOutcome, now: string): BindingState {
  if (outcome.kind === 'failed') {
    const lastError = outcome.code ? `${outcome.reason}:${outcome.code}` : outcome.reason;
    return { ...previous, lastError };
  }
  const etag = outcome.etag ?? previous.etag;
  return outcome.kind === 'moved'
    ? { etag, lastSyncAt: now, lastError: 'moved' }
    : { etag, lastSyncAt: now };
}
