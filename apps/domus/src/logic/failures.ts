// Everything that can go wrong, as one list of short names. A name without a
// sentence in both languages does not compile (strings.ts holds a Record over it) and
// test/failures.test.ts checks the sentences are not empty.
import {
  BadClock,
  BadSecret,
  StoreBlocked,
  StoreOpenError,
  UnknownStorage,
  type CycleFailure,
} from '@nexumia-de/hospes';

/** The failures of the storage port and of a cycle (the host package's), plus the app's own. */
export type Failure =
  | CycleFailure
  /** The storage settings of a stored space cannot be used (no token, bad address, unknown type). */
  | 'bad-storage'
  /** The stored secret is not a secret. */
  | 'bad-secret'
  /** The local database cannot be opened (a private window, blocked site data). */
  | 'store-unavailable'
  /** Another tab holds the local database back. */
  | 'store-blocked'
  | 'unexpected';

/** Every name, for the tests; the compiler checks this list is complete through `Record<Failure, …>`. */
export const FAILURES: readonly Failure[] = [
  'conflict',
  'unauthorised',
  'not-found',
  'unreachable',
  'blocked',
  'server',
  'not-sealed',
  'newer-version',
  'wrong-key',
  'bad-document',
  'other-space',
  'other-collection',
  'bad-now',
  'bad-storage',
  'bad-secret',
  'store-unavailable',
  'store-blocked',
  'unexpected',
];

/** A failure and the host's one-line detail, as the screens carry them. */
export interface Problem {
  failure: Failure;
  /** Fixed words from the host package: a status code, `rate-limited until <time>`, … Never a secret. */
  detail?: string;
}

/** The thing that was thrown, as a failure; nothing of its message is kept. */
export function problemOf(error: unknown): Problem {
  if (error instanceof StoreOpenError) return { failure: 'store-unavailable' };
  if (error instanceof StoreBlocked) return { failure: 'store-blocked' };
  if (error instanceof BadSecret) return { failure: 'bad-secret' };
  if (error instanceof BadClock) return { failure: 'bad-now' };
  if (error instanceof RangeError || error instanceof UnknownStorage)
    return { failure: 'bad-storage' };
  return { failure: 'unexpected' };
}
