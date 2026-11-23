// A storage in words, and what is checked about its address before anything is stored.
import { DEVICE_ONLY, isRepository, type StoredStorage } from '@nexumia-de/hospes';
import type { Strings } from '../strings';

/** The storages a space can be connected to; a space on this device only has none of them. */
export type StorageKind = 'github' | 'webdav';
export const isKind = (type: string): type is StorageKind => type === 'github' || type === 'webdav';

/** `owner/name` of a GitHub repository, as the adapter wants it (the host package's rule). */
export { isRepository };

/** A WebDAV address: https, a host, no user name or password in it. */
export function parseWebdavAddress(text: string): URL | undefined {
  try {
    const url = new URL(text.trim());
    if (url.protocol !== 'https:' || url.host === '' || url.username !== '' || url.password !== '')
      return undefined;
    return url;
  } catch {
    return undefined;
  }
}

/** Whether the address of this kind is one the adapter accepts. */
export function validAddress(type: string, address: string): boolean {
  if (type === 'github') return isRepository(address);
  if (type === 'webdav') return parseWebdavAddress(address) !== undefined;
  return false;
}

/**
 * "GitHub: owner/name", "WebDAV: host/path", "On this device only" for a space without a
 * storage; never a user name, password or token.
 */
export function storageWords(t: Strings, storage: { type: string; address: string }): string {
  if (storage.type === DEVICE_ONLY) return t.storage.deviceOnly;
  if (storage.type === 'github') return `GitHub: ${storage.address}`;
  if (storage.type === 'webdav') {
    const url = parseWebdavAddress(storage.address);
    if (url)
      return `WebDAV: ${url.host}${url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')}`;
    return 'WebDAV';
  }
  return storage.type;
}

export const storageOf = (
  type: StorageKind,
  address: string,
  access?: Record<string, string>,
): StoredStorage => ({ type, address, ...(access ? { access } : {}) });
