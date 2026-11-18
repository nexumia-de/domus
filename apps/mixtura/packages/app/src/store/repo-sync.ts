// Repositories of the device-local sync configuration: storages (where) and
// bindings (which unit lives where, with its passphrase). Like the entity
// repositories, but they validate against their own schemas (outside the
// export schema), are never read by the export, and do not count as changes
// for the backup reminder. Docs: docs/sync-backends.md#stores.

import { committed, request } from './db';
import { StoreError, toStoreError } from './errors';
import { createRepo, type Repo, type RepoContext } from './repo';
import type { Binding, BindingKey, Storage } from './types';

export const bindingsRepo = (context: RepoContext): Repo<Binding, BindingKey> =>
  createRepo<Binding, BindingKey>(context, {
    store: 'bindings',
    kind: 'binding',
    userIdFields: ['unitId', 'storageId'],
    counted: false,
  });

export interface StoragesRepo extends Repo<Storage> {
  /**
   * Removes a storage. Refused with a StoreError of kind `in-use` while a binding still
   * points at it: the check and the delete are one transaction.
   */
  delete(id: string): Promise<void>;
}

export function storagesRepo(context: RepoContext): StoragesRepo {
  const repo = createRepo<Storage>(context, {
    store: 'storages',
    kind: 'storage',
    userIdFields: ['id'],
    counted: false,
  });
  return {
    ...repo,
    async delete(id) {
      try {
        const tx = context.db.transaction(['storages', 'bindings'], 'readwrite');
        const done = committed(tx);
        done.catch(() => undefined);
        const bound = (await request(
          tx.objectStore('bindings').index('storageId').getAll(id),
        )) as Binding[];
        if (bound.length > 0) {
          tx.abort();
          throw new StoreError(
            'in-use',
            'The storage is still used by bindings',
            bound.map((b) => `${b.unitKind} ${b.unitId}`),
          );
        }
        tx.objectStore('storages').delete(id);
        await done;
      } catch (error) {
        throw toStoreError(error);
      }
    },
  };
}
