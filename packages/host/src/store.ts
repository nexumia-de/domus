// The port for local data that a sync cycle and the apps share: spaces and
// the state of each collection. Small and storage-agnostic; memory-store.ts
// and idb-store.ts fill it. See docs/spaces.md.
import type { SyncRecord } from '@nexumia-de/materia';

/** Where a space's files live; as in the invite. */
export interface StoredStorage {
  type: string;
  address: string;
  access?: Record<string, string>;
}

/**
 * A space on this device. The secret is kept in clear: the device's
 * storage is the trust boundary.
 */
export interface StoredSpace {
  /** The space id derived from the secret. */
  id: string;
  secret: string;
  /** Which person of the space this device is (docs/persons.md); never synced. */
  personId?: string;
  name?: string;
  storage: StoredStorage;
}

/** The local state of one collection of a space. */
export interface CollectionState {
  records: SyncRecord[];
  /** The `now` of the last successful cycle. */
  syncedAt?: string;
  /** The etag of the remote file after the last cycle. */
  etag?: string;
}

export interface Store {
  listSpaces(): Promise<StoredSpace[]>;
  getSpace(id: string): Promise<StoredSpace | undefined>;
  /** Adds or replaces the space with that id. */
  putSpace(space: StoredSpace): Promise<void>;
  /** Removes the space and all its collections. */
  removeSpace(id: string): Promise<void>;
  /** Empty records when the collection is unknown. */
  readCollection(spaceId: string, name: string): Promise<CollectionState>;
  /** Replaces the stored state atomically. */
  writeCollection(spaceId: string, name: string, state: CollectionState): Promise<void>;
  /**
   * Atomic read-modify-write: `fn` gets the current state (empty when
   * unknown) and returns the new one. It must be synchronous, so no other
   * change can come between the read and the write. An app uses it for a
   * change the user made, so a sync cycle running at the same time does
   * not lose it; the cycle uses it to store its result.
   * @returns The state as stored.
   */
  changeRecords(
    spaceId: string,
    name: string,
    fn: (current: CollectionState) => CollectionState,
  ): Promise<CollectionState>;
}

/** A copy that shares nothing with the argument (records are JSON). */
export const copyState = (s: CollectionState): CollectionState => structuredClone(s);
export const emptyState = (): CollectionState => ({ records: [] });
