// The sync loop with injected timers: a manual clock, no real waiting.
import { describe, expect, test } from 'vitest';
import { createSyncLoop, type SyncLoopOptions } from '../src/watch';

/** Timers that only move when the test says so. */
function clock() {
  let now = 0;
  let next = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    setTimer: (fn: () => void, ms: number) => {
      const id = next++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer: (h: unknown) => void timers.delete(h as number),
    pending: () => timers.size,
    /** Advances time, firing due timers in order, letting promises settle between. */
    async advance(ms: number): Promise<void> {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
        await settle();
      }
      now = end;
    },
  };
}
const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

function setup(
  extra: Partial<SyncLoopOptions> = {},
  results: (n: number) => { ok: boolean; pending?: boolean } | 'throw' = () => ({ ok: true }),
) {
  const c = clock();
  const log = { runs: 0, active: 0, maxActive: 0 };
  const release: (() => void)[] = [];
  let hold = false;
  const run = async () => {
    const n = ++log.runs;
    log.active++;
    log.maxActive = Math.max(log.maxActive, log.active);
    if (hold) await new Promise<void>((r) => release.push(r));
    log.active--;
    const r = results(n);
    if (r === 'throw') throw new Error('x');
    return r;
  };
  const loop = createSyncLoop({ run, setTimer: c.setTimer, clearTimer: c.clearTimer, ...extra });
  return {
    c,
    loop,
    log,
    hold: (v: boolean) => (hold = v),
    release: async () => {
      release.splice(0).forEach((r) => r());
      await settle();
    },
  };
}

describe('createSyncLoop', () => {
  test('runs now on start, then every interval (default 20 s)', async () => {
    const { c, loop, log } = setup();
    expect(log.runs).toBe(0);
    loop.start();
    await settle();
    expect(log.runs).toBe(1);
    await c.advance(19_999);
    expect(log.runs).toBe(1);
    await c.advance(1);
    expect(log.runs).toBe(2);
    await c.advance(20_000);
    expect(log.runs).toBe(3);
  });

  test('a given interval is used', async () => {
    const { c, loop, log } = setup({ intervalMs: 5_000 });
    loop.start();
    await settle();
    await c.advance(10_000);
    expect(log.runs).toBe(3);
  });

  test('stop cancels the timers; nothing runs after', async () => {
    const { c, loop, log } = setup();
    loop.start();
    await settle();
    loop.poke();
    loop.stop();
    expect(c.pending()).toBe(0);
    await c.advance(600_000);
    expect(log.runs).toBe(1);
  });

  test('never two cycles at once; a request during a run runs once after', async () => {
    const { c, loop, log, hold, release } = setup();
    hold(true);
    loop.start();
    await settle();
    loop.syncNow();
    loop.syncNow();
    loop.syncNow();
    await settle();
    expect(log.runs).toBe(1);
    hold(false);
    await release();
    expect(log.runs).toBe(2);
    expect(log.maxActive).toBe(1);
    await c.advance(0);
    expect(log.runs).toBe(2);
  });

  test('manual: nothing at start, no interval, no watch; asked cycles still run', async () => {
    let signal: (() => void) | undefined;
    const adapter = {
      watch: (_path: string, fn: () => void) => {
        signal = fn;
        return () => undefined;
      },
    };
    const { c, loop, log } = setup({ manual: true, adapter, path: 'p' });
    loop.start();
    await settle();
    await c.advance(600_000);
    expect(log.runs).toBe(0);
    expect(signal).toBeUndefined();
    expect(c.pending()).toBe(0);
    loop.syncNow();
    await settle();
    expect(log.runs).toBe(1);
    loop.poke();
    await c.advance(2_000);
    expect(log.runs).toBe(2);
    await c.advance(600_000);
    expect(log.runs).toBe(2);
  });

  test('runNow resolves with the result of its cycle; during a run it waits for one more', async () => {
    const { loop, log, hold, release } = setup({ manual: true }, (n) => ({ ok: n !== 3 }));
    expect(await loop.runNow()).toBe(false);
    loop.start();
    expect(await loop.runNow()).toBe(true);
    expect(log.runs).toBe(1);
    hold(true);
    const first = loop.runNow();
    await settle();
    const second = loop.runNow();
    let secondDone = false;
    void second.then(() => (secondDone = true));
    hold(false);
    await release();
    // The second request ran one more cycle after the first (n = 3, failed); both waited for it.
    expect(await first).toBe(false);
    expect(log.runs).toBe(3);
    expect(secondDone).toBe(true);
    expect(await second).toBe(false);
    loop.stop();
    expect(await loop.runNow()).toBe(false);
  });

  test('runNow offline runs nothing and says false', async () => {
    const { loop, log } = setup({ manual: true, isOnline: () => false });
    loop.start();
    expect(await loop.runNow()).toBe(false);
    expect(log.runs).toBe(0);
  });

  test('poke waits 2 s and several pokes make one cycle', async () => {
    const { c, loop, log } = setup();
    loop.start();
    await settle();
    loop.poke();
    await c.advance(1_500);
    loop.poke();
    await c.advance(1_500);
    expect(log.runs).toBe(1);
    await c.advance(500);
    expect(log.runs).toBe(2);
    await c.advance(10_000);
    expect(log.runs).toBe(2);
  });

  test('a result with pending asks for another cycle in 2 s', async () => {
    const { c, loop, log } = setup({}, (n) => ({ ok: true, pending: n === 1 }));
    loop.start();
    await settle();
    await c.advance(2_000);
    expect(log.runs).toBe(2);
  });

  test('a failed run backs off by doubling up to 5 minutes; a success resets it', async () => {
    let fail = true;
    const { c, loop, log } = setup({}, () => (fail ? { ok: false } : { ok: true }));
    loop.start();
    await settle();
    expect(log.runs).toBe(1);
    await c.advance(39_999);
    expect(log.runs).toBe(1);
    await c.advance(1); // 40 s after the first failure
    expect(log.runs).toBe(2);
    await c.advance(80_000);
    expect(log.runs).toBe(3);
    await c.advance(160_000);
    expect(log.runs).toBe(4);
    await c.advance(299_999);
    expect(log.runs).toBe(4);
    await c.advance(1); // capped at 300 s
    expect(log.runs).toBe(5);
    fail = false;
    await c.advance(300_000);
    expect(log.runs).toBe(6);
    await c.advance(20_000); // back to the plain interval
    expect(log.runs).toBe(7);
  });

  test('a run that throws counts as a failure and the loop goes on', async () => {
    const { c, loop, log } = setup({}, (n) => (n === 1 ? 'throw' : { ok: true }));
    loop.start();
    await settle();
    await c.advance(40_000);
    expect(log.runs).toBe(2);
    await c.advance(20_000);
    expect(log.runs).toBe(3);
  });

  test('with adapter.watch a change runs a cycle and the interval is a 5-minute safety net', async () => {
    let changed: () => void = () => undefined;
    let stopped = 0;
    let watchedPath = '';
    const adapter = {
      watch: (path: string, cb: () => void) => {
        watchedPath = path;
        changed = cb;
        return () => void stopped++;
      },
    };
    const { c, loop, log } = setup({ adapter, path: 'sp/list.json' });
    loop.start();
    await settle();
    expect(watchedPath).toBe('sp/list.json');
    await c.advance(299_999);
    expect(log.runs).toBe(1);
    await c.advance(1);
    expect(log.runs).toBe(2);
    changed();
    await settle();
    expect(log.runs).toBe(3);
    loop.stop();
    expect(stopped).toBe(1);
  });

  test('a watch signal during a run is remembered and runs once after', async () => {
    let changed: () => void = () => undefined;
    const adapter = { watch: (_p: string, cb: () => void) => ((changed = cb), () => undefined) };
    const { loop, log, hold, release } = setup({ adapter, path: 'p' });
    hold(true);
    loop.start();
    await settle();
    changed();
    changed();
    hold(false);
    await release();
    expect(log.runs).toBe(2);
  });

  test('offline: no run, the interval tries again; hidden: ticks are skipped but start and poke run', async () => {
    let online = false;
    let visible = false;
    const { c, loop, log } = setup({ isOnline: () => online, isVisible: () => visible });
    loop.start();
    await settle();
    expect(log.runs).toBe(0);
    online = true;
    await c.advance(20_000); // online, but hidden
    expect(log.runs).toBe(0);
    loop.poke();
    await c.advance(2_000);
    expect(log.runs).toBe(1);
    visible = true;
    await c.advance(20_000);
    expect(log.runs).toBe(2);
  });

  test('start twice starts once; start after stop starts again', async () => {
    const { loop, log } = setup();
    loop.start();
    loop.start();
    await settle();
    expect(log.runs).toBe(1);
    loop.stop();
    loop.start();
    await settle();
    expect(log.runs).toBe(2);
  });

  test('stop during a run: the run finishes and nothing follows', async () => {
    const { c, loop, log, hold, release } = setup();
    hold(true);
    loop.start();
    await settle();
    loop.stop();
    hold(false);
    await release();
    expect(c.pending()).toBe(0);
    await c.advance(600_000);
    expect(log.runs).toBe(1);
  });
});
