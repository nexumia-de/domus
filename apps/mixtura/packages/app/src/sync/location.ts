// Where a place's file lives: the folder the user chose in a storage, and the
// adapter for that storage. Docs: docs/screens-sync.md#data.

import type { StorageAdapter } from '@mixtura/engine';
import type { Binding, Storage } from '../store';
import { createWebdavAdapter } from './webdav';

export const DEFAULT_FOLDER = 'mixtura';

/** The folder as the app keeps it: no slashes at the ends, never `.` or `..`; `null` for text that cannot be one. */
export function normaliseFolder(raw: string): string | null {
  const segments = raw
    .trim()
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (segments.length === 0) return DEFAULT_FOLDER;
  if (segments.some((s) => s === '.' || s === '..')) return null;
  return segments.join('/');
}

/** The file of a place below the storage address: `<folder>/<place id>.json`. */
export const filePath = (folder: string, placeId: string): string => `${folder}/${placeId}.json`;

export const pathOf = (binding: Pick<Binding, 'folder' | 'unitId'>): string =>
  filePath(binding.folder, binding.unitId);

export const adapterFor = (storage: Storage): StorageAdapter =>
  createWebdavAdapter({
    baseUrl: storage.baseUrl,
    ...(storage.username !== undefined && { username: storage.username }),
    ...(storage.password !== undefined && { password: storage.password }),
  });
