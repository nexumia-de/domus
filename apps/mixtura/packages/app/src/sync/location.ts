// Where a place's file lives: the folder the user chose in a storage, and the
// adapter for that storage. Docs: docs/screens-sync.md#data.

import type { StorageAdapter } from '@mixtura/engine';
import type { Binding, Storage } from '../store';
import { createWebdavAdapter } from './webdav';

/** The folder a new binding proposes; shared with the other apps of a household. */
export const DEFAULT_FOLDER = 'household';
/** The default folder before 2026-11-18; bindings keep what they stored, and joining by hand looks here once. */
export const LEGACY_FOLDER = 'mixtura';

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

/**
 * The file of a place below the storage address: `<folder>/<place id>.json`.
 * One file per app: this is Mixtura's file. Other apps of the household keep
 * theirs next to it as `<folder>/<place id>.<app>.json` and Mixtura never
 * writes them. Docs: docs/decisions/stock-sync.md.
 */
export const filePath = (folder: string, placeId: string): string => `${folder}/${placeId}.json`;

export const pathOf = (binding: Pick<Binding, 'folder' | 'unitId'>): string =>
  filePath(binding.folder, binding.unitId);

export const adapterFor = (storage: Storage): StorageAdapter =>
  createWebdavAdapter({
    baseUrl: storage.baseUrl,
    ...(storage.username !== undefined && { username: storage.username }),
    ...(storage.password !== undefined && { password: storage.password }),
  });
