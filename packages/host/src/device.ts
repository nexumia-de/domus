// A space that is kept on this device only: it has a secret and an id like
// every space, but no storage yet, so nothing is sent anywhere. It is where
// an app keeps a shared collection (stock, the list) before the household set
// up sync; connecting a storage later turns it into an ordinary space with
// the same id and the same data. See docs/spaces.md#a-space-on-this-device-only.
import { deriveSpace, newSecret, type RandomBytes } from './space';
import type { Store, StoredSpace, StoredStorage } from './store';

/** The storage type of a space without a storage. `adapterFor` does not know it. */
export const DEVICE_ONLY = 'device';

/** The storage of a space that is on this device only. */
export const deviceOnlyStorage = (): StoredStorage => ({ type: DEVICE_ONLY, address: '' });

/** Whether the space has no storage: no cycle can run and no invite can be made. */
export const isDeviceOnly = (space: { storage: { type: string } }): boolean =>
  space.storage.type === DEVICE_ONLY;

// One run at a time per store, so two callers in one page do not both find
// "no space" and make two.
const running = new WeakMap<Store, Promise<StoredSpace[]>>();

/**
 * The spaces on this device, and a device-only one made first when there is
 * none: an app that keeps a shared collection always has a space to put it in.
 * Two apps that start at the same moment in two tabs can still both make one;
 * the person then sees two and can remove one.
 * @param name The name of the space that is made (the app's word for "Home").
 * @returns Every space, never empty.
 */
export function ensureSpace(
  store: Store,
  name: string,
  random?: RandomBytes,
): Promise<StoredSpace[]> {
  const busy = running.get(store);
  if (busy) return busy;
  const run = (async () => {
    const spaces = await store.listSpaces();
    if (spaces.length > 0) return spaces;
    const secret = newSecret(random);
    const { id } = await deriveSpace(secret);
    const space: StoredSpace = { id, secret, name, storage: deviceOnlyStorage() };
    await store.putSpace(space);
    return [space];
  })().finally(() => running.delete(store));
  running.set(store, run);
  return run;
}
