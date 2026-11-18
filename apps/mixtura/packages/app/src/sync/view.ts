// What the sync screens draw from: the storages, the bindings and the places,
// read from the local store when `syncRev` changed and kept in memory until
// then. The old view stays on screen while the new one loads.

import type { AppState } from '../app-state';
import type { ScreenContext } from '../screen';
import type { Store } from '../state';
import type { Binding, LocalStore, Place, Storage } from '../store';
import { placeStatus, type PlaceStatus } from './status';

export interface SyncView {
  storages: Storage[];
  /** Place bindings, one per bound place. */
  bindings: Binding[];
  /** Every place of the device, sorted by name. */
  places: Place[];
  /** The ids of the places that count. */
  ticked: string[];
}

interface Cache {
  local: LocalStore;
  view: SyncView | null;
  rev: string;
  loading: boolean;
}

let cache: Cache | undefined;

/** Something the sync screens show changed (a binding, a storage, a place): read the store again. */
export function invalidateSync(app: Store<AppState>): void {
  app.set({ syncRev: app.get().syncRev + 1 });
}

async function load(local: LocalStore): Promise<SyncView> {
  const [storages, bindings, selection] = await Promise.all([
    local.storages.list(),
    local.bindings.list(),
    local.placeSelection(),
  ]);
  return {
    storages,
    bindings: bindings.filter((b) => b.unitKind === 'place'),
    places: selection.places,
    ticked: selection.ticked,
  };
}

/** The view, or null until the first read finished (the finished read redraws). */
export function syncView({ state, store, data }: ScreenContext): SyncView | null {
  const local = data.local();
  if (!local) return null;
  if (cache?.local !== local) cache = { local, view: null, rev: '', loading: false };
  const entry = cache;
  // Places and stock change through the Stock screens too, so their counter is part of the key.
  const rev = `${state.syncRev}:${state.stockRev}`;
  if (entry.rev !== rev && !entry.loading) {
    entry.loading = true;
    load(local).then(
      (view) => {
        // Redraw only when something shown changed: a redraw costs a focused field its place.
        const changed = JSON.stringify(entry.view) !== JSON.stringify(view);
        entry.view = view;
        entry.rev = rev;
        entry.loading = false;
        if (changed) store.set({ syncViewRev: store.get().syncViewRev + 1 });
      },
      () => {
        // A failed read leaves the old view; asking again needs a change of `syncRev`.
        entry.rev = rev;
        entry.loading = false;
      },
    );
  }
  return entry.view;
}

/** The binding of a place, if it is synced. */
export const bindingOf = (view: SyncView, placeId: string): Binding | undefined =>
  view.bindings.find((b) => b.unitId === placeId);

export interface StatusContext {
  activity: (placeId: string) => { running: boolean; pending: boolean };
  online: boolean;
}

/** The state line of a place, derived from its binding and what the scheduler knows. */
export function statusOf(view: SyncView, placeId: string, context: StatusContext): PlaceStatus {
  const binding = bindingOf(view, placeId);
  return placeStatus({
    bound: binding !== undefined,
    lastSyncAt: binding?.lastSyncAt,
    lastError: binding?.lastError,
    ...context.activity(placeId),
    online: context.online,
  });
}
