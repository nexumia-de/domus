// The space whose stock is used, the others to choose from, and how it is kept in step: what the
// stock screen shows of spaces. Making, sharing and removing spaces is the Household app's.
import type { SpaceView, SyncStatus } from '@nexumia-de/hospes';
import { state } from './state';

export type { SpaceView, SyncStatus };

/** Every space of the device and the one used; empty before the start. */
export const stockSpaces = (): { spaces: readonly SpaceView[]; used: SpaceView | undefined } => {
  const now = state.stockSpace?.state();
  return { spaces: now?.spaces ?? [], used: now?.space };
};

/** True when the shared database could not be opened (a private window). */
export const stockUnavailable = (): boolean =>
  state.stockSpace === undefined || state.stockSpace.state().phase === 'failed';

export const chooseStockSpace = async (id: string): Promise<void> => {
  await state.stockSpace?.choose(id);
};

export const stockStatus = (): SyncStatus | undefined => state.stockSpace?.status();

/** Calls `listener` when the sync status changed; returns the way to stop. */
export const onStockStatus = (listener: () => void): (() => void) =>
  state.stockSpace?.onStatus(listener) ?? (() => undefined);

/** The page came to the front: spaces are read again and a cycle runs for every shared one. */
export const wakeStock = (): void => state.stockSpace?.wake();

/** The connection is back: a cycle now. */
export const stockOnline = (): void => state.stockSpace?.online();
