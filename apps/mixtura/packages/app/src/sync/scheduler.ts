// When sync runs: the one place where triggers live. One cycle per place at a
// time; a request during a cycle is queued once. An unbound place never
// causes a request; offline nothing is tried. Docs: docs/sync-cycle.md#triggers.

import type { Cipher, Envelope, StorageAdapter } from '@mixtura/engine';
import type { AppState } from '../app-state';
import type { Store } from '../state';
import type { Binding, LocalStore, Storage } from '../store';
import { applyOutcome } from './apply';
import { syncPlace } from './cycle';
import { adapterFor, pathOf } from './location';
import { snapshotOf } from './local-state';
import type { SyncOutcome } from './outcome';
import { nextState, withState } from './state';

/** A local change waits this long for more before it is sent. */
export const DEBOUNCE_MS = 3000;
/** A page that becomes visible syncs a place whose last sync is older than this. */
export const STALE_MS = 5 * 60 * 1000;

/** What a requested cycle came to; `skipped` means nothing was sent. */
export type CycleResult =
  SyncOutcome | { kind: 'skipped'; why: 'offline' | 'unbound' | 'no-store' };

export interface SchedulerDeps {
  /** The open local store, or null while it opens or after it failed. */
  local: () => LocalStore | null;
  app: Store<AppState>;
  /** The app's clock (`nowInstant`). */
  now: () => string;
  /** Whether the browser thinks it is online (`navigator.onLine`). */
  online: () => boolean;
  cipher: Cipher;
  /** The adapter of a storage; tests pass a fake. */
  adapter?: (storage: Storage) => StorageAdapter;
  debounceMs?: number;
  staleMs?: number;
}

export interface Scheduler {
  /** Runs a cycle for the place, or queues one behind the running cycle (once). Resolves with its result. */
  syncNow(placeId: string): Promise<CycleResult>;
  /** `syncNow` for every bound place. */
  syncAll(): Promise<void>;
  /** The store is open: sync every bound place once. */
  start(): Promise<void>;
  /** A stock record of the place was written: sync it after the debounce. */
  stockChanged(placeId: string): void;
  /** The browser came back online. */
  cameOnline(): Promise<void>;
  /** The page became visible. */
  becameVisible(): Promise<void>;
  /** For the state line: a cycle runs, or a change waits for one. */
  activity(placeId: string): { running: boolean; pending: boolean };
  /** Stops the timers. */
  dispose(): void;
}

const bindingKey = (placeId: string): ['place', string] => ['place', placeId];

export function createScheduler(deps: SchedulerDeps): Scheduler {
  const debounceMs = deps.debounceMs ?? DEBOUNCE_MS;
  const staleMs = deps.staleMs ?? STALE_MS;
  const adapter = deps.adapter ?? adapterFor;
  const running = new Map<string, Promise<CycleResult>>();
  const queued = new Map<string, Promise<CycleResult>>();
  const pending = new Set<string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** The last envelope of each place, to reuse its salt (keeps the derived key cached). */
  const envelopes = new Map<string, Envelope>();

  /** Redraw the screens that show a state line. */
  const touch = (): void => {
    deps.app.set({ syncRev: deps.app.get().syncRev + 1 });
  };

  /** Stores what the cycle learned in the binding, unless the binding was changed meanwhile. */
  async function remember(local: LocalStore, used: Binding, outcome: SyncOutcome): Promise<void> {
    const fresh = await local.bindings.get(bindingKey(used.unitId));
    if (!fresh || fresh.storageId !== used.storageId || fresh.folder !== used.folder) return;
    await local.bindings.put(withState(fresh, nextState(fresh, outcome, deps.now())));
  }

  async function runCycle(placeId: string): Promise<CycleResult> {
    const local = deps.local();
    if (!local) return { kind: 'skipped', why: 'no-store' };
    const binding = await local.bindings.get(bindingKey(placeId));
    if (!binding) {
      pending.delete(placeId);
      return { kind: 'skipped', why: 'unbound' };
    }
    if (!deps.online()) {
      pending.add(placeId);
      return { kind: 'skipped', why: 'offline' };
    }
    const [storage, snapshot] = await Promise.all([
      local.storages.get(binding.storageId),
      snapshotOf(local, placeId),
    ]);
    if (!storage || !snapshot) return { kind: 'skipped', why: 'unbound' };
    clearTimeout(timers.get(placeId));
    timers.delete(placeId);
    pending.delete(placeId);
    let outcome: SyncOutcome;
    try {
      outcome = await syncPlace({
        ...snapshot,
        adapter: adapter(storage),
        cipher: deps.cipher,
        path: pathOf(binding),
        passphrase: binding.passphrase,
        previous: envelopes.get(placeId),
      });
    } catch {
      outcome = { kind: 'failed', reason: 'internal' };
    }
    try {
      if (outcome.kind !== 'failed') {
        await applyOutcome(local, deps.app, outcome);
        if (outcome.envelope) envelopes.set(placeId, outcome.envelope);
      }
      await remember(local, binding, outcome);
    } catch {
      // The store refused the write (closed, full): the next cycle merges again.
    }
    return outcome;
  }

  /** Never rejects: an unexpected throw (closed store, bad snapshot) is an internal failure. */
  async function cycle(placeId: string): Promise<CycleResult> {
    try {
      return await runCycle(placeId);
    } catch {
      return { kind: 'failed', reason: 'internal' };
    }
  }

  function request(placeId: string): Promise<CycleResult> {
    const current = running.get(placeId);
    if (!current) {
      const run = cycle(placeId).finally(() => {
        running.delete(placeId);
        touch();
      });
      running.set(placeId, run);
      touch();
      return run;
    }
    let next = queued.get(placeId);
    if (!next) {
      const again = (): Promise<CycleResult> => {
        queued.delete(placeId);
        return request(placeId);
      };
      next = current.then(again, again);
      queued.set(placeId, next);
    }
    return next;
  }

  /** The bound places, moved ones left out: their file says the place lives elsewhere now. */
  async function bound(only?: (b: Binding) => boolean): Promise<Binding[]> {
    const local = deps.local();
    if (!local) return [];
    const all = await local.bindings.list();
    return all.filter(
      (b) => b.unitKind === 'place' && b.lastError !== 'moved' && (only?.(b) ?? true),
    );
  }

  const syncEach = async (bindings: Binding[]): Promise<void> => {
    await Promise.all(bindings.map((b) => request(b.unitId)));
  };

  return {
    syncNow: request,
    async syncAll() {
      const local = deps.local();
      if (!local) return;
      const all = await local.bindings.list();
      await syncEach(all.filter((b) => b.unitKind === 'place'));
    },
    start: async () => syncEach(await bound()),
    stockChanged(placeId) {
      const local = deps.local();
      if (!local) return;
      void local.bindings.get(bindingKey(placeId)).then((binding) => {
        if (!binding || binding.lastError === 'moved') return;
        pending.add(placeId);
        clearTimeout(timers.get(placeId));
        timers.set(
          placeId,
          setTimeout(() => {
            timers.delete(placeId);
            void request(placeId);
          }, debounceMs),
        );
        touch();
      });
    },
    cameOnline: async () => syncEach(await bound()),
    becameVisible: async () => {
      const now = Date.parse(deps.now());
      await syncEach(
        await bound((b) => b.lastSyncAt === undefined || now - Date.parse(b.lastSyncAt) > staleMs),
      );
    },
    activity: (placeId) => ({
      running: running.has(placeId),
      pending: pending.has(placeId) || timers.has(placeId),
    }),
    dispose() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}
