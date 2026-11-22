// When to run a sync cycle, without a screen or a UI framework: on start,
// on an interval (or on the storage's own change signal), after a local
// change (debounced), never two at once, with a back-off after failures.
// In manual mode only when asked. Every timer is injected. See docs/spaces.md.
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
  /**
   * Cycles run only when asked (`poke`, `syncNow`, `runNow`): none at start, no interval, no
   * watch. For an app that decides itself when to sync (Emptio, docs/spaces.md).
   */
  manual?: boolean;
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
  /**
   * A cycle now, waited for; resolves with whether the last cycle of the run went through. A cycle
   * in flight finishes first and one more runs after it (unless the one in flight fails, which is
   * then the answer). False when stopped or offline.
   */
  runNow(): Promise<boolean>;
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

  const manual = options.manual === true;
  let started = false;
  let running = false;
  let again = false;
  let failures = 0;
  /** Whether the last cycle went through. */
  let lastOk = false;
  /** The run of cycles in flight; a request during it is served by its last cycle. */
  let inflight: Promise<void> | undefined;
  let tick: unknown;
  let poke: unknown;
  let unwatch: (() => void) | undefined;

  const clearAll = (): void => {
    if (tick !== undefined) clearTimer(tick);
    if (poke !== undefined) clearTimer(poke);
    tick = poke = undefined;
  };

  const scheduleTick = (): void => {
    if (!started || manual) return;
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

  const cycle = (): Promise<void> => {
    if (!started) return Promise.resolve();
    if (running) {
      again = true;
      return inflight ?? Promise.resolve();
    }
    if (options.isOnline && !options.isOnline()) {
      lastOk = false;
      scheduleTick();
      return Promise.resolve();
    }
    running = true;
    inflight = runCycles();
    return inflight;
  };

  const runCycles = async (): Promise<void> => {
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
        lastOk = ok;
        if (!started) return;
        if (pending) schedulePoke();
        // A request that came during the run runs once now; after a failure
        // the back-off decides instead.
        if (!(again && ok)) break;
      }
    } finally {
      running = false;
      inflight = undefined;
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
      if (manual) return;
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
    async runNow() {
      if (!started) return false;
      if (options.isOnline && !options.isOnline()) return false;
      await cycle();
      return started && lastOk;
    },
  };
}
