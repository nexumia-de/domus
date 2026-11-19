/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// Two tabs (#113): when another tab upgrades the database, this tab's
// connection is closed so the upgrade can proceed; the app is told (it then
// asks for a reload) and a later write fails cleanly instead of hanging.
import { expect, test, vi } from 'vitest';
import { SCHEMA_VERSION } from '../src/store/schema';
import { freshFactory, openFresh, user } from './helpers';

test('another tab upgrading the database closes this connection and reports it once', async () => {
  const factory = freshFactory();
  const onVersionChange = vi.fn();
  const store = await openFresh({ factory, onVersionChange });
  const spec = user.specs[0]!;
  await store.specs.put({ ...spec, id: 'u-00000000-0000-4000-8000-000000000001' });

  // The "newer tab": opens the same database one version higher and gets through.
  await new Promise<void>((resolve, reject) => {
    const open = factory.open('mixtura', SCHEMA_VERSION + 1);
    open.onsuccess = () => {
      open.result.close();
      resolve();
    };
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('the old tab did not close its connection'));
  });
  expect(onVersionChange).toHaveBeenCalledTimes(1);

  // The old tab's next write is refused with a store error, not left hanging.
  await expect(
    store.specs.put({ ...spec, id: 'u-00000000-0000-4000-8000-000000000002' }),
  ).rejects.toMatchObject({ name: 'StoreError' });
});
