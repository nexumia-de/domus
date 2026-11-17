// The one error type of the store. `kind` says what the app does about it:
// the first three put the app in read-only mode with a banner, the others
// refuse one write.

export type StoreErrorKind =
  /** No IndexedDB, or the browser refuses it (private window, blocked site data). */
  | 'unavailable'
  /** An upgrade waits for another tab that still has the old version open. */
  | 'blocked'
  /** The stored schema version is newer than this app knows. */
  | 'too-new'
  /** The device has no room left. */
  | 'quota'
  /** The value does not validate against its JSON Schema or breaks a store rule. */
  | 'invalid'
  /** A migration threw; the upgrade was rolled back and the old data is untouched. */
  | 'migration'
  /** The bundled seed data did not load or has the wrong shape. */
  | 'seed'
  | 'failed';

export class StoreError extends Error {
  constructor(
    readonly kind: StoreErrorKind,
    message: string,
    /** Schema problems for `invalid`, one line each. */
    readonly details: readonly string[] = [],
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
