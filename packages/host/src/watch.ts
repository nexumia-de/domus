// When to run a sync cycle, without a screen or a UI framework: on start,
// on an interval (or on the storage's own change signal), after a local
// change (debounced), never two at once, with a back-off after failures.
// Every timer is injected. See docs/spaces.md.
import type { StorageAdapter } from '@nexumia-de/materia';

export interface SyncLoopOptions {
  /** One cycle; a rejection or `ok: false` counts as a failure, `pending: true` asks for another soon. */
  run: () => Promise<{ ok: boolean; pending?: boolean }>;
  adapter?: Pick<StorageAdapter, 'watch'>;
  /** The path to watch when the adapter can. */
  path?: string;
  /** Interval between cycles; default 20 000 ms. */
  intervalMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Interval and watch signals do nothing while this says false (a hidden page). */
  isVisible?: () => boolean;
  /** Nothing runs while this says false; the interval tries again later. */
  isOnline?: () => boolean;
}

export interface SyncLoop {
  /** Runs a cycle now and keeps running them. */
  start(): void;
  /** Cancels timers and the watch; a cycle in flight finishes but nothing follows. */
  stop(): void;
  /** Asks for a cycle soon (2 s, so several changes make one write). */
  poke(): void;
  /** Asks for a cycle now (for example when the page comes to the front). */
  syncNow(): void;
}

export const DEFAULT_INTERVAL_MS = 20_000;
/** With a watch the interval is only a safety net. */
export const WATCH_SAFETY_MS = 300_000;
export const POKE_DELAY_MS = 2_000;
export const MAX_BACKOFF_MS = 300_000;

/** Creates a loop; nothing happens until `start()`. */
export function createSyncLoop(options: SyncLoopOptions): SyncLoop {
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer =
    options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const watching = options.adapter?.watch !== undefined && options.path !== undefined;
  const base = watching ? Math.max(intervalMs, WATCH_SAFETY_MS) : intervalMs;

  let started = false;
  let running = false;
  let again = false;
  let failures = 0;
  let tick: unknown;
  let poke: unknown;
  let unwatch: (() => void) | undefined;

  const clearAll = (): void => {
    if (tick !== undefined) clearTimer(tick);
    if (poke !== undefined) clearTimer(poke);
    tick = poke = undefined;
  };

  const scheduleTick = (): void => {
    if (!started) return;
    if (tick !== undefined) clearTimer(tick);
    const delay = Math.min(MAX_BACKOFF_MS, base * 2 ** failures);
    // After failures the back-off applies even to the safety interval, up to its cap.
    tick = setTimer(
      () => {
        tick = undefined;
        if (options.isVisible && !options.isVisible()) scheduleTick();
        else void cycle();
      },
      failures === 0 ? base : delay,
    );
  };

  const cycle = async (): Promise<void> => {
    if (!started) return;
    if (running) {
      again = true;
      return;
    }
    if (options.isOnline && !options.isOnline()) {
      scheduleTick();
      return;
    }
    running = true;
    try {
      for (;;) {
        again = false;
        let ok = false;
        let pending = false;
        try {
          const result = await options.run();
          ok = result.ok;
          pending = ok && result.pending === true;
        } catch {
          ok = false;
        }
        failures = ok ? 0 : failures + 1;
        if (!started) return;
        if (pending) schedulePoke();
        // A request that came during the run runs once now; after a failure
        // the back-off decides instead.
        if (!(again && ok)) break;
      }
    } finally {
      running = false;
    }
    scheduleTick();
  };

  const schedulePoke = (): void => {
    if (!started) return;
    if (poke !== undefined) clearTimer(poke);
    poke = setTimer(() => {
      poke = undefined;
      void cycle();
    }, POKE_DELAY_MS);
  };

  return {
    start() {
      if (started) return;
      started = true;
      failures = 0;
      if (watching && options.adapter?.watch && options.path !== undefined) {
        unwatch = options.adapter.watch(options.path, () => {
          if (!options.isVisible || options.isVisible()) void cycle();
        });
      }
      void cycle();
    },
    stop() {
      started = false;
      again = false;
      clearAll();
      unwatch?.();
      unwatch = undefined;
    },
    poke: schedulePoke,
    syncNow() {
      void cycle();
    },
  };
}
