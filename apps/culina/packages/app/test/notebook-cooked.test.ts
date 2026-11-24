// The date a dish was cooked, through the notebook (docs/behaviour.md#the-date-a-dish-was-cooked):
// one day per dish family, kept by the end of cooking and "Cooked today", cleared, deleted and
// brought back with the dish, read again at the next start. The day is the injected clock's.
// What it does not prove: fake-indexeddb and an injected clock, not a browser's storage and a real
// device's day; the screens that call these functions (e2e/dish-cooked.mjs).
import { describe, expect, test } from 'vitest';
import { cookedId } from '@culina/engine';
import { asNextVersion } from '../src/editor/version-save';
import {
  clearCooked,
  cookedByFamily,
  cookedOn,
  getDish,
  headOfFamily,
  localToday,
  markCooked,
  newId,
  removeFamily,
  restoreFamily,
  saveRecord,
  today,
} from '../src/notebook';
import { state } from '../src/notebook/state';
import type { Store } from '../src/store';
import { startWithStock } from './stock-helpers';
import { must } from './must';

const DISH = 'example-vegetable-plate';
const OTHER = 'example-flat-dough-with-sauce';
const clockAt = (instant: { now: string }) => () => instant.now;

const rowsOf = async (id: string) => {
  const rows = must(state.store).listRows('cooked');
  const listed = await rows;
  if (!listed.ok) throw new Error(listed.error.code);
  return listed.rows.filter((r) => r.key === id);
};

describe('the day a dish was cooked', () => {
  test('is kept for the family on the injected day, and only for that dish', async () => {
    const clock = { now: '2026-11-24T18:30:00.000Z' };
    await startWithStock({ now: clockAt(clock) });
    expect(cookedOn(DISH)).toBeUndefined();
    const done = await markCooked(DISH);
    expect(done).toEqual({ ok: true, date: '2026-11-24' });
    expect(cookedOn(DISH)).toBe('2026-11-24');
    // Control: the other dish has no day.
    expect(cookedOn(OTHER)).toBeUndefined();
    expect(state.cooked).toEqual([{ id: cookedId(DISH), dish: DISH, date: '2026-11-24' }]);
  });

  test('cooking again replaces the day: one record, no history, no count', async () => {
    const clock = { now: '2026-11-02T12:00:00.000Z' };
    await startWithStock({ now: clockAt(clock) });
    await markCooked(DISH);
    clock.now = '2026-11-24T12:00:00.000Z';
    await markCooked(DISH);
    expect(cookedOn(DISH)).toBe('2026-11-24');
    expect(state.cooked).toHaveLength(1);
    const rows = await rowsOf(cookedId(DISH));
    expect(rows.map((r) => r.value?.date)).toEqual(['2026-11-24']);
  });

  test('belongs to the dish, not the version: a new version keeps it, an old version id sets it', async () => {
    const clock = { now: '2026-11-20T08:00:00.000Z' };
    await startWithStock({ now: clockAt(clock) });
    const first = must(getDish(DISH));
    await markCooked(DISH);
    const second = asNextVersion(first, false, { change: 'more salt' }, newId(), today());
    must(await saveRecord('dishes', second).then((r) => (r.ok ? r : undefined)));
    expect(headOfFamily('dishes', DISH)?.id).toBe(second.id);
    expect(cookedOn(second.id)).toBe('2026-11-20');
    // The cook screen of the old version was open while the new one was saved (another tab):
    // finishing it dates the dish, which the new head shows.
    clock.now = '2026-11-24T08:00:00.000Z';
    await markCooked(DISH);
    expect(cookedOn(second.id)).toBe('2026-11-24');
    expect(cookedByFamily().size).toBe(1);
  });

  test('clear removes the day (a tombstone), and clearing nothing is no error', async () => {
    await startWithStock();
    await markCooked(DISH);
    expect((await clearCooked(DISH)).ok).toBe(true);
    expect(cookedOn(DISH)).toBeUndefined();
    const rows = await rowsOf(cookedId(DISH));
    expect(rows.map((r) => r.deleted)).toEqual([true]);
    expect((await clearCooked(DISH)).ok).toBe(true);
  });

  test('deleting the dish takes its day; Undo brings both back', async () => {
    await startWithStock();
    await markCooked(DISH);
    const removed = await removeFamily('dishes', DISH);
    if (!removed.ok) throw new Error(removed.error.code);
    expect(removed.removed.cooked?.date).toBe(localToday());
    expect(cookedByFamily().has(DISH)).toBe(false);
    expect((await restoreFamily(removed.removed)).ok).toBe(true);
    expect(cookedOn(DISH)).toBe(localToday());
  });

  test('control: deleting a dish never cooked works as before and brings back no day', async () => {
    await startWithStock();
    const removed = await removeFamily('dishes', OTHER);
    if (!removed.ok) throw new Error(removed.error.code);
    expect(removed.removed.cooked).toBeUndefined();
    expect((await restoreFamily(removed.removed)).ok).toBe(true);
    expect(cookedOn(OTHER)).toBeUndefined();
  });

  test('is read again at the next start', async () => {
    const { factory } = await startWithStock();
    await markCooked(DISH);
    await startWithStock({ factory, examples: false });
    expect(cookedOn(DISH)).toBe(localToday());
  });

  test('a store that refuses the write keeps the day as it was and says why', async () => {
    const clock = { now: '2026-11-02T12:00:00.000Z' };
    await startWithStock({ now: clockAt(clock) });
    await markCooked(DISH);
    const real = must(state.store);
    state.store = {
      ...real,
      put: () => Promise.resolve({ ok: false, error: { code: 'quota-exceeded' } }),
    } as Store;
    clock.now = '2026-11-24T12:00:00.000Z';
    const done = await markCooked(DISH);
    expect(done.ok === false && done.error.code).toBe('quota-exceeded');
    expect(cookedOn(DISH)).toBe('2026-11-02');
    state.store = real;
  });

  test('with no store nothing is kept, and an id that is no dish is refused', async () => {
    await startWithStock();
    expect((await markCooked('example-no-such-dish')).ok).toBe(false);
    const real = state.store;
    state.store = undefined;
    const done = await markCooked(DISH);
    expect(done.ok === false && done.error.code).toBe('unavailable');
    expect(cookedOn(DISH)).toBeUndefined();
    state.store = real;
  });

  test('a record for a family with no dish, or with a stray id, dates nothing', async () => {
    await startWithStock();
    state.cooked = [
      { id: cookedId('u-gone'), dish: 'u-gone', date: '2026-11-01' },
      { id: cookedId(OTHER), dish: DISH, date: '2026-11-01' },
    ];
    expect(cookedOn(DISH)).toBeUndefined();
    expect(cookedOn(OTHER)).toBeUndefined();
  });
});

describe('the day is the device calendar day, not the UTC day', () => {
  test('Berlin at 00:30 on 25 Nov (UTC still 24 Nov) keeps 25 Nov', async () => {
    await startWithStock({ now: () => '2026-11-24T23:30:00.000Z' });
    state.timeZone = 'Europe/Berlin';
    expect(await markCooked(DISH)).toEqual({ ok: true, date: '2026-11-25' });
    expect(cookedOn(DISH)).toBe('2026-11-25');
  });

  test('New York at 23:30 on 24 Nov (UTC already 25 Nov) keeps 24 Nov', async () => {
    await startWithStock({ now: () => '2026-11-25T04:30:00.000Z' });
    state.timeZone = 'America/New_York';
    expect(await markCooked(DISH)).toEqual({ ok: true, date: '2026-11-24' });
  });

  test('control: at noon UTC the zones agree with the UTC day', async () => {
    await startWithStock({ now: () => '2026-11-24T12:00:00.000Z' });
    state.timeZone = 'Europe/Berlin';
    expect(await markCooked(DISH)).toEqual({ ok: true, date: '2026-11-24' });
  });
});

describe('what is not written', () => {
  test('cooking again on the same day writes nothing (the row keeps its stamp)', async () => {
    const clock = { now: '2026-11-24T08:00:00.000Z' };
    await startWithStock({ now: () => clock.now });
    state.timeZone = 'UTC';
    await markCooked(DISH);
    const first = await rowsOf(cookedId(DISH));
    clock.now = '2026-11-24T19:00:00.000Z';
    expect(await markCooked(DISH)).toEqual({ ok: true, date: '2026-11-24' });
    expect(await rowsOf(cookedId(DISH))).toEqual(first);
    // Control: the next day is written.
    clock.now = '2026-11-25T08:00:00.000Z';
    await markCooked(DISH);
    expect((await rowsOf(cookedId(DISH)))[0]?.value?.date).toBe('2026-11-25');
  });

  test('a dish another tab deleted meanwhile gets no day', async () => {
    await startWithStock();
    // The other tab tombstoned the dish's versions; this tab's cache still has it.
    expect((await must(state.store).remove('dishes', DISH)).ok).toBe(true);
    const done = await markCooked(DISH);
    expect(done.ok === false && done.error.code).toBe('not-found');
    expect(await rowsOf(cookedId(DISH))).toEqual([]);
    // Control: a dish still there gets its day.
    expect((await markCooked(OTHER)).ok).toBe(true);
  });
});
