// The one error type of the store. `kind` says what the app does about it:
// `unavailable`, `blocked`, `stale` and `too-new` put the app in read-only mode with a banner, the others
// refuse one write.

export type StoreErrorKind =
  /** No IndexedDB, or the browser refuses it (private window, blocked site data). */
  | 'unavailable'
  /** An upgrade waits for another tab that still has the old version open. */
  | 'blocked'
  /** Another window upgraded the database; this window's connection is closed and it must reload. */
  | 'stale'
  /** The stored schema version is newer than this app knows. */
  | 'too-new'
  /** The device has no room left. */
  | 'quota'
  /** The value does not validate against its JSON Schema or breaks a store rule. */
  | 'invalid'
  /** The entity is still referenced by others; `referrers` names them. */
  | 'referenced'
  /** A storage is still used by bindings; `details` names them. Remove the bindings first. */
  /** A migration threw; the upgrade was rolled back and the old data is untouched. */
  | 'migration'
  /** The bundled seed data did not load or has the wrong shape. */
  | 'seed'
  | 'failed';

/** One thing that still uses an entity a user tried to delete. */
export interface Referrer {
  kind: 'drink' | 'ingredient' | 'prepared' | 'riff' | 'affinity';
  id: string;
  name: string;
}

export class StoreError extends Error {
  constructor(
    readonly kind: StoreErrorKind,
    message: string,
    /** Schema problems for `invalid`, one line each. */
    readonly details: readonly string[] = [],
    /** What still uses the entity, for `referenced`. */
    readonly referrers: readonly Referrer[] = [],
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

/** Maps what IndexedDB throws to a StoreError; a StoreError passes through. */
export function toStoreError(error: unknown): StoreError {
  if (error instanceof StoreError) return error;
  const name = (error as { name?: string } | null)?.name ?? '';
  const message = (error as { message?: string } | null)?.message || name || String(error);
  if (name === 'QuotaExceededError') return new StoreError('quota', message);
  if (name === 'VersionError') return new StoreError('too-new', message);
  if (['SecurityError', 'InvalidStateError', 'UnknownError', 'NotFoundError'].includes(name)) {
    return new StoreError('unavailable', message);
  }
  return new StoreError('failed', message);
}
