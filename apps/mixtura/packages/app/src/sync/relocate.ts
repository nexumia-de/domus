// "Move": the place's file goes to another storage or folder. The merge of
// `movePlace` is applied and the binding points at the new location; the old
// file keeps a marker. Docs: docs/screens-sync.md#move.

import type { Cipher } from '@mixtura/engine';
import type { AppState } from '../app-state';
import type { Store } from '../state';
import type { LocalStore, Storage } from '../store';
import { applyOutcome } from './apply';
import { snapshotOf } from './local-state';
import { adapterFor, filePath, normaliseFolder, pathOf } from './location';
import { movePlace } from './move';
import { withState } from './state';
import { problemOfFailure, type SyncProblem } from './status';

export interface RelocateInput {
  placeId: string;
  storageId: string;
  folder: string;
}

export type RelocateProblem =
  SyncProblem | 'invalid-folder' | 'no-storage' | 'unbound' | 'same-place';

export type RelocateResult =
  { ok: true; marked: boolean } | { ok: false; problem: RelocateProblem };

export interface RelocateDeps {
  local: LocalStore;
  app: Store<AppState>;
  cipher: Cipher;
  now: () => string;
  adapter?: (storage: Storage) => ReturnType<typeof adapterFor>;
}

export async function relocatePlace(
  deps: RelocateDeps,
  input: RelocateInput,
): Promise<RelocateResult> {
  const { local } = deps;
  const adapter = deps.adapter ?? adapterFor;
  const folder = normaliseFolder(input.folder);
  if (folder === null) return { ok: false, problem: 'invalid-folder' };
  const binding = await local.bindings.get(['place', input.placeId]);
  if (!binding) return { ok: false, problem: 'unbound' };
  if (binding.storageId === input.storageId && binding.folder === folder) {
    return { ok: false, problem: 'same-place' };
  }
  const [from, to, snapshot] = await Promise.all([
    local.storages.get(binding.storageId),
    local.storages.get(input.storageId),
    snapshotOf(local, input.placeId),
  ]);
  if (!from || !to || !snapshot) return { ok: false, problem: 'no-storage' };

  const outcome = await movePlace({
    ...snapshot,
    cipher: deps.cipher,
    at: deps.now(),
    from: { adapter: adapter(from), path: pathOf(binding), passphrase: binding.passphrase },
    to: {
      adapter: adapter(to),
      path: filePath(folder, input.placeId),
      passphrase: binding.passphrase,
    },
  });
  if (outcome.kind === 'failed') return { ok: false, problem: problemOfFailure(outcome) };
  await applyOutcome(local, deps.app, outcome);
  if (outcome.kind === 'moved') {
    // The old file already says the place moved: record that, keep the binding.
    await local.bindings.put({ ...binding, lastError: 'moved' });
    return { ok: false, problem: 'moved' };
  }
  const next = { etag: outcome.etag, lastSyncAt: deps.now() };
  await local.bindings.put({ ...withState(binding, next), storageId: to.id, folder });
  return { ok: true, marked: outcome.marked };
}
