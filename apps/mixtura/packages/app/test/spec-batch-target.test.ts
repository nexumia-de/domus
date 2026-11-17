/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixtures are known; a missing entry should fail the test */
import { describe, expect, test } from 'vitest';
import { parseHash } from '../src/router';
import {
  MAX_BATCH_DRINKS,
  parseBatchDrinks,
  parseBatchVolume,
  pourMl,
  servingsFor,
  volumeOf,
} from '../src/screens/spec/batch-target';
import { batchVM } from '../src/screens/spec/batch-vm';
import { servingsOf, specAddress } from '../src/screens/spec/servings';
import { applySwap } from '../src/screens/spec/swap-state';
import { specVM } from '../src/screens/spec/view-model';
import { seedModel } from './browse-fixture';

const q = (s: string): URLSearchParams => new URLSearchParams(s);

describe('the target in the address', () => {
  test('a volume is a number above 0 up to 100 l, anything else is none', () => {
    expect(volumeOf(q('volume=1000'))).toBe(1000);
    expect(volumeOf(q('volume=750.5'))).toBe(750.5);
    for (const bad of ['', 'volume=0', 'volume=-5', 'volume=100001', 'volume=x', 'volume=1e3'])
      expect(volumeOf(q(bad))).toBeUndefined();
  });
  test('the address carries volume with the sheet only and drops it with the sheet', () => {
    const route = parseHash('#/drinks/daiquiri?servings=3');
    expect(specAddress(route, 3, 'batch', 1000)).toBe(
      '#/drinks/daiquiri?servings=3&sheet=batch&volume=1000',
    );
    expect(specAddress(parseHash('#/drinks/daiquiri?sheet=batch&volume=1000'), 1, null)).toBe(
      '#/drinks/daiquiri',
    );
    expect(specAddress(parseHash('#/drinks/daiquiri?sheet=batch&volume=1000'), 1, 'batch')).toBe(
      '#/drinks/daiquiri?sheet=batch',
    );
  });
  test('more than 12 drinks are in the address, up to 200', () => {
    expect(servingsOf(q('servings=40'))).toBe(40);
    expect(servingsOf(q(`servings=${MAX_BATCH_DRINKS + 1}`))).toBe(1);
  });
});

describe('typed targets', () => {
  test('a volume: plain numbers are ml, units convert, decimal comma', () => {
    expect(parseBatchVolume('1000')).toEqual({ ok: true, ml: 1000 });
    expect(parseBatchVolume('1 l')).toEqual({ ok: true, ml: 1000 });
    expect(parseBatchVolume('1,5 l')).toEqual({ ok: true, ml: 1500 });
    expect(parseBatchVolume('32 oz')).toMatchObject({ ok: true });
    expect(parseBatchVolume('2 litres')).toEqual({ ok: true, ml: 2000 });
    for (const bad of ['', '0', '-1', 'abc', '5 g', '101 l']) {
      expect(parseBatchVolume(bad).ok).toBe(false);
    }
  });
  test('a number of drinks: whole, 1 to 200', () => {
    expect(parseBatchDrinks('40')).toBe(40);
    expect(parseBatchDrinks(' 200 ')).toBe(200);
    for (const bad of ['', '0', '201', '2.5', '-3', 'x'])
      expect(parseBatchDrinks(bad)).toBeUndefined();
  });
});

describe('a batch for a volume', () => {
  const model = seedModel();
  const spec = model.byLineage.get('daiquiri')!.spec;
  const vm = (ml: number, system: 'metric' | 'us' = 'metric') =>
    batchVM(
      model.tree,
      spec.method,
      spec.lines,
      { kind: 'volume', ml },
      system,
      model.ingredientName,
    );
  const rows = (ml: number) => Object.fromEntries(vm(ml).rows.map((r) => [r.label, r.value]));

  test('the servings are the volume over one pour, a fraction', () => {
    const pour = pourMl(model.tree, spec.method, spec.lines)!;
    expect(pour).toBeGreaterThan(100);
    expect(servingsFor(1000, pour)).toBeCloseTo(1000 / pour, 10);
    const r = rows(1000);
    expect(r['Servings']).toBe(`${Math.round(10000 / pour) / 10} of 131 ml`);
  });

  test('the title names the volume, the mode is volume, the sheet can switch back', () => {
    const v = vm(1000);
    expect(v.title).toBe('Batch of 1000 ml');
    expect(v.control).toMatchObject({ mode: 'volume', fieldValue: '1000 ml' });
    expect(v.failure).toBeUndefined();
  });

  test('the totals follow the volume: as made it is close to the target', () => {
    const total = Number(/^(\d+)/.exec(rows(1000)['Total volume']!)![1]);
    expect(Math.abs(total - 1000)).toBeLessThan(30);
    expect(rows(1000)['Yield']).toMatch(/servings$/);
  });

  test('a volume of one serving or more works, below one serving says why', () => {
    expect(vm(131).failure).toBeUndefined();
    expect(vm(140).failure).toBeUndefined();
    const small = vm(50);
    expect(small.failure).toBe(
      'That is less than one serving. One drink is 131 ml; enter at least that.',
    );
    expect(small.lines).toEqual([]);
    expect(small.control.mode).toBe('volume');
  });

  test('US display names the volume in oz', () => {
    expect(vm(1000, 'us').title).toMatch(/oz/);
  });

  test("for a number of drinks the control starts a volume from today's batch", () => {
    const v = batchVM(
      model.tree,
      spec.method,
      spec.lines,
      { kind: 'drinks', servings: 4 },
      'metric',
      model.ingredientName,
    );
    expect(v.control).toEqual({ mode: 'drinks', fieldValue: '4', startMl: 530 });
  });

  test('more than 12 drinks make a batch', () => {
    const v = batchVM(
      model.tree,
      spec.method,
      spec.lines,
      { kind: 'drinks', servings: 40 },
      'metric',
      model.ingredientName,
    );
    expect(v.title).toBe('Batch of 40 drinks');
    expect(v.lines.map((l) => l.amount)).toEqual(['2400 ml', '900 ml', '900 ml']);
  });

  test('a drink without a method has no batch for a volume either', () => {
    const none = batchVM(
      model.tree,
      undefined,
      spec.lines,
      { kind: 'volume', ml: 1000 },
      'metric',
      model.ingredientName,
    );
    expect(none.failure).toMatch(/needs a method/);
  });

  test('in swap mode the batch is made from the swapped lines, for a volume too', () => {
    const swapped = applySwap(spec.lines, {
      lines: { 0: { ingredientId: 'tequila-blanco' } },
    } as never);
    const v = batchVM(
      model.tree,
      spec.method,
      swapped,
      { kind: 'volume', ml: 1000 },
      'metric',
      model.ingredientName,
    );
    expect(v.lines.some((l) => l.name.includes('Tequila'))).toBe(true);
  });

  test('the spec view model builds the volume batch from the address option', () => {
    const view = specVM(model, spec, 'metric', { batch: true, volumeMl: 1000 });
    expect(view.batch?.control.mode).toBe('volume');
    expect(specVM(model, spec, 'metric', { batch: true }).batch?.control.mode).toBe('drinks');
  });
});
