// Editor drafts: unsaved work kept per editor address, one `{ key, value }`
// record each. Not entities: no schema, never exported, and a write does not
// count as a change for the backup reminder (docs/store.md#drafts).

import { committed } from './db';
import { toStoreError } from './errors';
import { keyValueRepo } from './repo-settings';

export interface DraftsRepo {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export function draftsRepo(db: IDBDatabase): DraftsRepo {
  const kv = keyValueRepo<unknown>(db, 'drafts');
  return {
    get: (key) => kv.get(key),
    put: (key, value) => kv.set(key, value),
    async delete(key) {
      try {
        const tx = db.transaction('drafts', 'readwrite');
        const done = committed(tx);
        done.catch(() => undefined);
        tx.objectStore('drafts').delete(key);
        await done;
      } catch (error) {
        throw toStoreError(error);
      }
    },
  };
}
