// Binding a place to a storage and taking it off again: the rules behind
// "Sync This Place", "Stop Syncing" and the place of a moved file.
// Docs: docs/screens-sync.md#actions.

import type { LocalStore, Binding } from '../store';

/** Stores the binding; the first cycle is the caller's to start. */
export async function bindPlace(
  local: LocalStore,
  input: { placeId: string; storageId: string; folder: string; passphrase: string },
): Promise<Binding> {
  const binding: Binding = {
    unitKind: 'place',
    unitId: input.placeId,
    storageId: input.storageId,
    folder: input.folder,
    passphrase: input.passphrase,
  };
  await local.bindings.put(binding);
  return binding;
}

/** Removes the binding at once; the removed one comes back for Undo. Local data and the file stay. */
export async function unbindPlace(
  local: LocalStore,
  placeId: string,
): Promise<Binding | undefined> {
  const old = await local.bindings.get(['place', placeId]);
  if (old) await local.bindings.delete(['place', placeId]);
  return old;
}
