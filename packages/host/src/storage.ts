// The one place that knows the storage types: a space stores
// `{ type, address, access? }` and this gives the adapter for it.
import type { StorageAdapter } from '@nexumia-de/materia';
import { createGithubAdapter } from './github';
import type { StoredStorage } from './store';
import { createWebdavAdapter } from './webdav';

/** The storage type is not one this build knows. */
export class UnknownStorage extends Error {
  constructor(type: string) {
    super(`Unknown storage type: ${type}`);
    this.name = 'UnknownStorage';
  }
}

export interface StorageDeps {
  /**
   * Base of GitHub's REST API for a `github` storage; default `https://api.github.com`. A
   * build fixes it (the apps compile it in); it is never part of a stored space or an invite,
   * so a link cannot send a token to another host.
   */
  apiBase?: string;
  fetch?: typeof fetch;
  online?: () => boolean;
  delay?: (ms: number) => Promise<void>;
}

/**
 * @throws UnknownStorage for a type other than `github` and `webdav`.
 * @throws RangeError for a GitHub storage without a token or with a bad address.
 */
export function adapterFor(storage: StoredStorage, deps: StorageDeps = {}): StorageAdapter {
  const { fetch, online, delay, apiBase } = deps;
  switch (storage.type) {
    case 'github': {
      const token = storage.access?.token;
      if (token === undefined || token === '')
        throw new RangeError('The GitHub storage has no token');
      return createGithubAdapter({
        repository: storage.address,
        token,
        ...(apiBase !== undefined ? { apiBase } : {}),
        ...(fetch ? { fetch } : {}),
        ...(online ? { online } : {}),
      });
    }
    case 'webdav': {
      const { username, password } = storage.access ?? {};
      return createWebdavAdapter({
        baseUrl: storage.address,
        ...(username !== undefined ? { username } : {}),
        ...(password !== undefined ? { password } : {}),
        ...(fetch ? { fetch } : {}),
        ...(online ? { online } : {}),
        ...(delay ? { delay } : {}),
      });
    }
    default:
      throw new UnknownStorage(storage.type);
  }
}
