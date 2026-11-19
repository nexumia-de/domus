// The local store: the one entry point for the app (opened once at startup by src/notebook).
export { checkStore } from './check';
export { openStore } from './open';
export type { OpenOptions, OpenResult } from './open';
export { persistenceState, requestPersistence, storageEstimate } from './persistence';
export type { PersistenceState } from './persistence';
export type { ReadStore, Store } from './repository';
export type { Draft, Drafts } from './drafts';
export type { Bulk, Change, Entry } from './bulk';
export { setStoreLogSink } from './log';
export { KINDS } from './types';
export type {
  ErrorCode,
  Kind,
  Migration,
  Result,
  Row,
  Rows,
  StoredRecord,
  StoreError,
} from './types';
