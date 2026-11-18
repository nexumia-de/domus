// A store that refuses a write must not leave a Sync sheet stuck on "busy".
import { beforeEach, expect, test, vi } from 'vitest';
import { initialState } from '../src/app-state';
import { drafts, resetAll } from '../src/screens/sync/drafts';
import { start as bindStart } from '../src/screens/sync/bind-sheet';
import { start as joinStart } from '../src/screens/sync/join-sheet';
import { save as saveStorage } from '../src/screens/sync/storage-sheet';
import { syncStrings } from '../src/screens/sync/strings';
import type { ScreenContext } from '../src/screen';
import { createStore } from '../src/state';
import { newUserId } from '../src/store';
import { openFresh } from './helpers';

vi.mock('../src/screens/sync/sheet-address', () => ({
  closeSyncSheet: vi.fn(),
  openSyncSheet: vi.fn(),
}));

beforeEach(resetAll);

async function rig() {
  const local = await openFresh();
  const store = createStore(initialState('#/settings/sync', { theme: 'system', units: 'metric' }));
  const context = {
    store,
    data: { local: () => local, sync: { syncNow: vi.fn() } },
  } as unknown as ScreenContext;
  return { local, context };
}

test('a bind that throws clears busy and says so', async () => {
  const { local, context } = await rig();
  vi.spyOn(local.bindings, 'put').mockRejectedValue(new Error('closed'));
  const view = { storages: [{ id: 's1' }] } as never;
  drafts.bind.storageId = 's1';
  drafts.bind.passphrase = 'p';
  await bindStart(context, { id: 'p1', name: 'Bar' } as never, view);
  expect(drafts.bind.busy).toBe(false);
  expect(drafts.bind.problem).toBe(syncStrings.failed);
});

test('a join that throws clears busy and says so', async () => {
  const { local, context } = await rig();
  vi.spyOn(local.storages, 'get').mockRejectedValue(new Error('closed'));
  Object.assign(drafts.join, {
    storageId: 's1',
    folder: 'mixtura',
    code: newUserId(),
    passphrase: 'p',
  });
  await joinStart(context);
  expect(drafts.join.busy).toBe(false);
  expect(drafts.join.problem).toBe(syncStrings.failed);
});

test('a storage that cannot be saved says so and stays open', async () => {
  const { local, context } = await rig();
  vi.spyOn(local.storages, 'put').mockRejectedValue(new Error('full'));
  Object.assign(drafts.storage, { label: 'Mine', address: 'https://dav.example/dav' });
  await saveStorage(context);
  expect(drafts.storage.problem).toBe(syncStrings.failed);
});
