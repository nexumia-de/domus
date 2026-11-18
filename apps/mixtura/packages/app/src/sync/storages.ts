// The rules for the storage list: what a storage needs, adding, and removing
// (refused while a place uses it). Device-local; nothing here is synced.
// Docs: docs/screens-sync.md#storages.

import { newUserId, type Binding, type LocalStore, type Place, type Storage } from '../store';

export interface StorageDraft {
  label: string;
  address: string;
  username: string;
  password: string;
}

export type StorageRefusal = 'empty-label' | 'empty-address' | 'bad-address';

/** The address as kept: trimmed, no trailing slash; null when it is not an http(s) address. */
export function checkAddress(raw: string): string | null {
  const text = raw.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s]+$/.test(text)) return null;
  try {
    return new URL(text).host === '' ? null : text;
  } catch {
    return null;
  }
}

/** The storage a draft describes, or why it is not one. */
export function checkStorage(
  draft: StorageDraft,
): { ok: true; storage: Omit<Storage, 'id'> } | { ok: false; reason: StorageRefusal } {
  const label = draft.label.trim();
  if (label === '') return { ok: false, reason: 'empty-label' };
  if (draft.address.trim() === '') return { ok: false, reason: 'empty-address' };
  const baseUrl = checkAddress(draft.address);
  if (baseUrl === null) return { ok: false, reason: 'bad-address' };
  return {
    ok: true,
    storage: {
      label,
      type: 'webdav',
      baseUrl,
      ...(draft.username !== '' && { username: draft.username }),
      ...(draft.password !== '' && { password: draft.password }),
    },
  };
}

export async function addStorage(
  local: LocalStore,
  storage: Omit<Storage, 'id'>,
): Promise<Storage> {
  const made: Storage = { ...storage, id: newUserId() };
  await local.storages.put(made);
  return made;
}

/** The names of the places that sync through a storage, in the order of the list of places. */
export function placesUsing(
  storageId: string,
  bindings: readonly Binding[],
  places: readonly Place[],
): string[] {
  const used = new Set(bindings.filter((b) => b.storageId === storageId).map((b) => b.unitId));
  return places.filter((p) => used.has(p.id)).map((p) => p.name);
}

/**
 * Removes a storage unless a place uses it; the answer names the places. The store checks again
 * inside its transaction, so a binding made a moment ago still refuses.
 */
export async function removeStorage(
  local: LocalStore,
  storage: Storage,
): Promise<{ ok: true } | { ok: false; places: string[] }> {
  const [bindings, places] = await Promise.all([local.bindings.list(), local.places.list()]);
  const using = placesUsing(storage.id, bindings, places);
  if (using.length > 0) return { ok: false, places: using };
  try {
    await local.storages.delete(storage.id);
  } catch (error) {
    if ((error as { kind?: string }).kind === 'in-use') {
      return { ok: false, places: placesUsing(storage.id, await local.bindings.list(), places) };
    }
    throw error;
  }
  return { ok: true };
}
