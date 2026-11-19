// "Join a Place": bind this device to a place somebody else shares, from the
// four values entered by hand. The file is read first, without writing, so a
// wrong passphrase or a missing file leaves nothing behind. Docs:
// docs/screens-sync.md#join-a-place.

import type { Cipher, StorageAdapter } from '@mixtura/engine';
import { isUserId, type LocalStore } from '../store';
import { snapshotOf } from './local-state';
import { adapterFor, filePath, normaliseFolder } from './location';
import { normalisePassphrase } from './passphrase';
import { syncPlace } from './cycle';
import type { Scheduler } from './scheduler';
import { problemOfFailure, type SyncProblem } from './status';

/** Shown until the first sync brings the real name. */
export const JOINED_PLACE_NAME = 'Joined place';
/** Older than any real name, so the name in the file wins the first merge. */
const BEFORE_ANY_NAME = '1970-01-01T00:00:00.000Z';

export interface JoinInput {
  storageId: string;
  folder: string;
  placeCode: string;
  passphrase: string;
}

export type JoinProblem =
  | SyncProblem
  | 'invalid-code'
  | 'invalid-folder'
  | 'no-storage'
  | 'empty-passphrase'
  | 'missing-file';

export type JoinResult = { ok: true; created: boolean } | { ok: false; problem: JoinProblem };

export interface JoinDeps {
  local: LocalStore;
  scheduler: Pick<Scheduler, 'syncNow'>;
  cipher: Cipher;
  /** For tests. */
  adapter?: (storage: Parameters<typeof adapterFor>[0]) => StorageAdapter;
  /** The place and its stock were written: redraw the screens that show them. */
  changed: () => void;
}

/** Puts the device's choice of counting places back to what it was, with the place added or taken out. */
async function tick(local: LocalStore, placeId: string, on: boolean): Promise<void> {
  const selection = await local.placeSelection();
  const has = selection.ticked.includes(placeId);
  if (has === on) return;
  const ticked = on
    ? [...selection.ticked, placeId]
    : selection.ticked.filter((id) => id !== placeId);
  await local.settings.set('places', { ticked, entry: selection.entry });
}

export async function joinPlace(deps: JoinDeps, input: JoinInput): Promise<JoinResult> {
  const { local } = deps;
  const placeId = input.placeCode.trim();
  if (!isUserId(placeId)) return { ok: false, problem: 'invalid-code' };
  const folder = normaliseFolder(input.folder);
  if (folder === null) return { ok: false, problem: 'invalid-folder' };
  const passphrase = normalisePassphrase(input.passphrase);
  if (passphrase.trim() === '') return { ok: false, problem: 'empty-passphrase' };
  const storage = await local.storages.get(input.storageId);
  if (!storage) return { ok: false, problem: 'no-storage' };

  const existing = await snapshotOf(local, placeId);
  const previous = await local.bindings.get(['place', placeId]);
  // Read only: nothing is created before the file is known to be there and to open.
  const probe = await syncPlace({
    place: existing?.place ?? { id: placeId, name: JOINED_PLACE_NAME, updatedAt: BEFORE_ANY_NAME },
    rows: existing?.rows ?? [],
    ingredients: existing?.ingredients ?? [],
    adapter: (deps.adapter ?? adapterFor)(storage),
    cipher: deps.cipher,
    path: filePath(folder, placeId),
    passphrase,
    readOnly: true,
  });
  if (probe.kind === 'failed') return { ok: false, problem: problemOfFailure(probe) };
  if (probe.kind === 'moved') return { ok: false, problem: 'moved' };
  if (probe.etag === undefined) return { ok: false, problem: 'missing-file' };

  const created = existing === undefined;
  if (created) {
    await local.places.put({ id: placeId, name: JOINED_PLACE_NAME, updatedAt: BEFORE_ANY_NAME });
    await tick(local, placeId, true);
  }
  await local.bindings.put({
    unitKind: 'place',
    unitId: placeId,
    storageId: storage.id,
    folder,
    passphrase,
  });
  deps.changed();

  const first = await deps.scheduler.syncNow(placeId);
  if (first.kind !== 'failed' && first.kind !== 'skipped') return { ok: true, created };

  // The first cycle failed after all: take back what this join made.
  if (previous) await local.bindings.put(previous);
  else await local.bindings.delete(['place', placeId]);
  if (created) {
    for (const row of await local.stock.listBy('placeId', placeId)) {
      await local.stock.delete([placeId, row.ingredientId]);
    }
    await tick(local, placeId, false);
    await local.places.delete(placeId);
  }
  deps.changed();
  return {
    ok: false,
    problem: first.kind === 'failed' ? problemOfFailure(first) : 'unreachable',
  };
}
