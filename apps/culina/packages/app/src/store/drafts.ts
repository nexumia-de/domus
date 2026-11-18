// Drafts: forms the user has not saved. One row per edited record or per "new" form, in the
// `drafts` object store: `{ key, updatedAt, value }` like every row, but the value is whatever
// the form holds (it may not satisfy a schema yet). Never exported, never synced, never logged
// with content. A removed draft is deleted outright: nothing needs a tombstone.
import { nextUpdatedAt } from './clock';
import { failed, run } from './idb';
import { fail, type Result } from './types';

export interface Draft {
  key: string;
  updatedAt: string;
  value: unknown;
}

export interface Drafts {
  get(key: string): Promise<Result<{ draft: Draft | undefined }>>;
  put(key: string, value: unknown): Promise<Result<{ draft: Draft }>>;
  remove(key: string): Promise<Result>;
  /** Every draft, sorted by key. */
  list(): Promise<Result<{ drafts: Draft[] }>>;
}

export const draftStore = (db: IDBDatabase, now: () => string): Drafts => ({
  async get(key) {
    try {
      const draft = await run(db, ['drafts'], 'readonly', (tx) => {
        const request = tx.objectStore('drafts').get(key);
        return () => request.result as Draft | undefined;
      });
      return { ok: true, draft };
    } catch (error) {
      return failed(error);
    }
  },
  async put(key, value) {
    try {
      const draft = await run(db, ['drafts'], 'readwrite', (tx, abort) => {
        const store = tx.objectStore('drafts');
        const request = store.get(key);
        let written: Draft | undefined;
        request.onsuccess = () => {
          try {
            const stored = request.result as Draft | undefined;
            written = {
              key,
              updatedAt: nextUpdatedAt(now, stored?.updatedAt),
              value: structuredClone(value),
            };
            store.put(written);
          } catch (error) {
            abort(error);
          }
        };
        return () => written;
      });
      return draft ? { ok: true, draft } : fail({ code: 'unavailable' });
    } catch (error) {
      return failed(error);
    }
  },
  async remove(key) {
    try {
      await run(db, ['drafts'], 'readwrite', (tx) => {
        tx.objectStore('drafts').delete(key);
        return () => undefined;
      });
      return { ok: true };
    } catch (error) {
      return failed(error);
    }
  },
  async list() {
    try {
      const drafts = await run(db, ['drafts'], 'readonly', (tx) => {
        const request = tx.objectStore('drafts').getAll();
        return () => request.result as Draft[];
      });
      return { ok: true, drafts: drafts.sort((a, b) => (a.key < b.key ? -1 : 1)) };
    } catch (error) {
      return failed(error);
    }
  },
});
