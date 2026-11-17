/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixtures are known; a missing entry should fail the test */
import { computeBalance } from '@mixtura/engine';
import { describe, expect, test } from 'vitest';
import { droppedSwap, parseHash } from '../src/router';
import { initialSpecView } from '../src/screens/spec/session';
import { swapDelta, signed } from '../src/screens/spec/swap-delta';
import {
  applySwap,
  formatSwap,
  noSwap,
  parseSwapAmount,
  stepAmount,
  swapOf,
  withAmount,
  withIngredient,
  withoutLine,
  type Swap,
} from '../src/screens/spec/swap-state';
import { specVM } from '../src/screens/spec/view-model';
import { fixtureModel, seedModel } from './browse-fixture';

const q = (text: string) => new URLSearchParams(text);
const VERDICTS =
  /\b(good|bad|wrong|balanced|perfect|score|grade|warning|error|too sweet|too sour)\b/i;

describe('the swap in the address', () => {
  test('no parameter is no swap mode, an empty one is swap mode with nothing changed', () => {
    expect(swapOf(q('servings=2'))).toBeNull();
    expect(swapOf(q('swap='))).toEqual({ lines: {} });
  });
  test('round trip, sorted by line', () => {
    const swap: Swap = {
      lines: { 2: { amount: { value: 0.75, unit: 'oz_us' } }, 0: { ingredientId: 'light-rum' } },
    };
    expect(formatSwap(swap)).toBe('0:light-rum:,2::0.75oz_us');
    expect(swapOf(q(`swap=${formatSwap(swap)}`))).toEqual(swap);
  });
  test('an id with the separators survives', () => {
    const swap: Swap = { lines: { 1: { ingredientId: 'a:b,c' } } };
    const query = new URLSearchParams();
    query.set('swap', formatSwap(swap));
    expect(swapOf(new URLSearchParams(query.toString()))).toEqual(swap);
  });
  test.each(['x::', '1:', '1::bad', '1::0ml', '1::99999ml', '1::5top', '-1:a:', '1.5:a:'])(
    'unreadable entry %s is left out',
    (entry) => {
      const lines = swapOf(q(`swap=${entry}`))!.lines;
      expect(Object.values(lines).filter((l) => l.amount !== undefined)).toEqual([]);
    },
  );
});

describe('changing a swap', () => {
  const lines = [
    { ingredientId: 'rum', amount: 60, unit: 'ml' },
    { ingredientId: 'lime', amount: 22.5, unit: 'ml', substitutes: [{ ingredientId: 'x' }] },
    { ingredientId: 'soda', amount: 1, unit: 'top' },
  ];
  test('the saved value clears the change', () => {
    let swap = withIngredient(noSwap, 0, 'cognac', lines[0]!);
    expect(swap.lines[0]).toEqual({ ingredientId: 'cognac' });
    swap = withIngredient(swap, 0, 'rum', lines[0]!);
    expect(swap).toEqual(noSwap);
    swap = withAmount(noSwap, 0, { value: 60, unit: 'ml' }, lines[0]!);
    expect(swap).toEqual(noSwap);
  });
  test('reset a line keeps the others', () => {
    let swap = withAmount(noSwap, 0, { value: 45, unit: 'ml' }, lines[0]!);
    swap = withIngredient(swap, 1, 'lemon', lines[1]!);
    expect(Object.keys(withoutLine(swap, 0).lines)).toEqual(['1']);
  });
  test('apply: new ingredient drops its substitutes, new amount ends a range, top keeps its amount', () => {
    const swap: Swap = {
      lines: {
        0: { amount: { value: 1, unit: 'oz_us' } },
        1: { ingredientId: 'lemon' },
        2: { ingredientId: 'tonic', amount: { value: 5, unit: 'ml' } },
        9: { ingredientId: 'ghost' },
      },
    };
    const out = applySwap([{ ...lines[0]!, amountMax: 90 }, lines[1]!, lines[2]!], swap);
    expect(out[0]).toEqual({ ingredientId: 'rum', amount: 1, unit: 'oz_us' });
    expect(out[1]).toEqual({ ingredientId: 'lemon', amount: 22.5, unit: 'ml' });
    expect(out[2]).toEqual({ ingredientId: 'tonic', amount: 1, unit: 'top' });
    expect(out).toHaveLength(3);
  });
});

describe('typed amounts and steps', () => {
  test.each([
    ['45 ml', 45, 'ml'],
    ['3/4 oz', 0.75, 'oz_us'],
    ['1½ oz', 1.5, 'oz_us'],
    ['2 dashes', 2, 'dash'],
    ['22,5', 22.5, 'ml'],
    ['30', 30, 'ml'],
  ])('%s', (text, value, unit) => {
    const r = parseSwapAmount(text, 'ml');
    expect(r.ok && r.amount.value === value && r.amount.unit === unit).toBe(true);
  });
  test('a bare number takes the line unit', () => {
    const r = parseSwapAmount('1.5', 'oz_us');
    expect(r.ok && r.amount).toEqual({ value: 1.5, unit: 'oz_us' });
  });
  test.each(['', 'abc', '0', '0 ml', '5 parsecs', '20000 ml', '-3 ml'])(
    '%s is refused with a reason',
    (t) => {
      const r = parseSwapAmount(t, 'ml');
      expect(r.ok).toBe(false);
      expect(!r.ok && r.message.length).toBeGreaterThan(3);
    },
  );
  test('steps follow the pour grid and never reach 0', () => {
    expect(stepAmount({ value: 22.5, unit: 'ml' }, 1).value).toBe(25);
    expect(stepAmount({ value: 0.75, unit: 'oz_us' }, -1).value).toBe(0.5);
    expect(stepAmount({ value: 2.5, unit: 'ml' }, -1).value).toBe(2.5);
    expect(stepAmount({ value: 2, unit: 'dash' }, 1).value).toBe(3);
  });
});

describe('leaving a swap', () => {
  const at = (hash: string) => parseHash(hash);
  test('a swap with changes is dropped by leaving; the route is kept for Undo', () => {
    const swapped = at('#/drinks/a?swap=0:x:');
    expect(droppedSwap(swapped, at('#/drinks/a'))).toBe(swapped);
    expect(droppedSwap(swapped, at('#/drinks'))).toBe(swapped);
  });
  test('nothing to drop for an empty swap, a kept swap or a sheet closing', () => {
    expect(droppedSwap(at('#/drinks/a?swap='), at('#/drinks/a'))).toBeNull();
    expect(
      droppedSwap(at('#/drinks/a?swap=0:x:'), at('#/drinks/a?swap=0:x:&sheet=line-1')),
    ).toBeNull();
  });
});

describe('the spec with a swap (fixture drinks)', () => {
  const model = fixtureModel();
  const daiquiri = model.drinks.find((d) => d.spec.name === 'Daiquiri')!.spec;
  const vm = (swap: string | null, view = initialSpecView) =>
    specVM(model, daiquiri, 'metric', {
      swap: swap === null ? null : swapOf(q(`swap=${swap}`)),
      view,
    });

  test('outside swap mode nothing changes', () => {
    const v = vm(null);
    expect(v.swap).toBeUndefined();
    expect(v.lines.every((l) => l.swap === undefined)).toBe(true);
    expect(v.balance.figures.every((f) => f.change === undefined)).toBe(true);
  });

  test('swap mode with nothing changed says so and changes no figure', () => {
    const v = vm('');
    expect(v.swap?.banner).toBe('Trying a swap. Change a line to see the numbers.');
    expect(v.swap?.count).toBe(0);
    expect(v.swap?.templateChange).toBeUndefined();
    expect(v.balance.figures.every((f) => f.change?.endsWith('(no change)'))).toBe(true);
    expect(v.lines.every((l) => l.swap?.changed === false)).toBe(true);
  });

  test('the shown difference equals the recomputed difference', () => {
    const v = vm('0:cognac:');
    const before = computeBalance(model.tree, { method: 'shake', lines: daiquiri.lines });
    const swapped = applySwap(daiquiri.lines, swapOf(q('swap=0:cognac:'))!);
    const after = computeBalance(model.tree, { method: 'shake', lines: swapped });
    const d = swapDelta(before, after);
    const abvOf = (r: typeof before): number =>
      r.ok && r.value.after?.abvPct.known ? (r.value.after.abvPct as { value: number }).value : NaN;
    expect(d.figures.abv.delta).toBeCloseTo(
      Number(abvOf(after).toFixed(1)) - Number(abvOf(before).toFixed(1)),
      9,
    );
    const abv = v.balance.figures[0]!;
    expect(abv.change).toMatch(/^Was \d+\.\d %? ?/);
    expect(abv.change).toContain('→ now');
    expect(v.lines[0]).toMatchObject({ name: 'Cognac', swap: { changed: true, was: '60 ml Rum' } });
    expect(v.swap?.banner).toBe('Trying a swap. Nothing is saved.');
  });

  test('before and after on the screen always add up', () => {
    for (const swap of ['0::45ml', '1::30ml', '2::25ml', '0:cognac:90ml']) {
      const abv = vm(swap).balance.figures[0]!;
      const m =
        /Was ([\d.]+) % \u2192 now ([\d.]+) % \((?:([+\u2212][\d.]+) points|no change)\)/.exec(
          abv.change ?? '',
        );
      expect(m, swap).not.toBeNull();
      const delta = Number((m![3] ?? '0').replace('\u2212', '-'));
      expect(Number((Number(m![1]) + delta).toFixed(1)), swap).toBe(Number(m![2]));
    }
  });

  test('a swap that fits another template says so, a swap that fits none says so', () => {
    const other = vm('2:creme:');
    expect(other.swap?.templateChange).toBe('Now matches the Sidecar template. Before: Daiquiri.');
    expect(other.tags[0]?.text).toBe('Sidecar template (suggested)');
    const none = vm('1:simple:');
    expect(none.swap?.templateChange).toBe('Now matches no template. Before: Daiquiri.');
    expect(none.tags[0]?.text).toBe('No template');
    expect(none.balance.figures.every((f) => f.track === undefined)).toBe(true);
  });

  test('an amount change keeps the template and gives numbers against the same range', () => {
    const v = vm('2::25ml');
    expect(v.swap?.templateChange).toBeUndefined();
    expect(v.balance.figures[1]!.change).toContain('→ now');
    expect(v.balance.figures[1]!.wasLeft).toBeTypeOf('number');
  });

  test('the compact bar carries the three figures with their differences', () => {
    const v = vm('2::7.5ml');
    expect(v.swap!.compact.map((c) => c.name)).toEqual(['ABV', 'Sugar', 'Acid']);
    expect(v.swap!.compact[1]!.deltaShort).toMatch(/^−/);
  });

  test('servings scale the swapped lines and the batch uses them', () => {
    const v = specVM(model, daiquiri, 'metric', {
      swap: swapOf(q('swap=0::45ml')),
      servings: 2,
      batch: true,
    });
    expect(v.lines[0]!.amount).toBe('90 ml');
    expect(v.lines[0]!.swap?.was).toBe('120 ml');
    expect(v.batch?.lines[0]?.amount).toBe('90 ml');
  });

  test('no verdict words anywhere in the swap texts', () => {
    const v = vm('0:cognac:30ml');
    const text = [
      v.swap?.banner,
      v.swap?.templateChange,
      ...v.balance.figures.flatMap((f) => [f.change, f.deltaShort]),
      v.balance.volumeWas,
    ].join('\n');
    expect(text).not.toMatch(VERDICTS);
    expect(signed(0, 1)).toBe('0.0');
  });

  test('the saved spec is never changed', () => {
    const copy = JSON.stringify(daiquiri);
    vm('0:cognac:30ml');
    expect(JSON.stringify(daiquiri)).toBe(copy);
  });
});

describe('the line sheet', () => {
  const model = fixtureModel();
  const daiquiri = model.drinks.find((d) => d.spec.name === 'Daiquiri')!.spec;
  const sheet = (swap: string, line: number, view = initialSpecView) =>
    specVM(model, daiquiri, 'metric', { swap: swapOf(q(`swap=${swap}`)), sheetLine: line, view })
      .swap!.sheet!;

  test('offers by role from the engine, nearest first, the line itself not among them', () => {
    const s = sheet('', 0);
    expect(s.groups.map((g) => g.kind)).toEqual(['role']);
    const ids = s.groups[0]!.offers.map((o) => o.id);
    expect(ids).toEqual(['cognac', 'gin', 'london-gin']);
    expect(ids).not.toContain('rum');
    expect(s.groups[0]!.offers[0]!.path).toBe('Spirits');
    expect(s.noOffers).toBe(false);
  });
  test('the chosen ingredient is marked and the saved one offered again', () => {
    const s = sheet('0:cognac:', 0);
    expect(s.groups[0]!.offers.find((o) => o.id === 'cognac')?.selected).toBe(true);
    expect(s.saved).toEqual({ id: 'rum', name: 'Rum' });
    expect(s.changed).toBe(true);
    expect(s.title).toBe('Change Cognac');
  });
  test('amount: what the field shows and what was understood', () => {
    expect(sheet('', 1).amount).toEqual({ text: '22.5 ml', understood: '= 22.5 ml' });
    const typed = { ...initialSpecView, swapField: { index: 1, text: '3/4 oz' } };
    expect(sheet('1::0.75oz_us', 1, typed).amount).toEqual({
      text: '3/4 oz',
      understood: '= 22.5 ml',
    });
    const bad = { ...initialSpecView, swapField: { index: 1, text: 'blah' } };
    expect(sheet('', 1, bad).amount?.understood).toBeUndefined();
  });
  test('search covers all ingredients, ignoring case and accents', () => {
    const view = { ...initialSpecView, swapQuery: 'CREME' };
    expect(sheet('', 0, view).search.results.map((r) => r.id)).toEqual(['creme']);
    const none = sheet('', 0, { ...initialSpecView, swapQuery: 'zzz' });
    expect(none.search.none).toBe(true);
    expect(sheet('', 0).search.results).toEqual([]);
  });
  test('a top line takes an ingredient but shows no amount field', () => {
    const gas = model.drinks.find((d) => d.spec.name === 'Gin and Soda')!.spec;
    const s = specVM(
      model,
      { ...gas, lines: [...gas.lines, { ingredientId: 'soda', amount: 1, unit: 'top' }] },
      'metric',
      {
        swap: noSwap,
        sheetLine: 2,
      },
    ).swap!.sheet!;
    expect(s.amount).toBeUndefined();
    expect(s.topNote).toBeTruthy();
  });
  test('a line that does not exist has no sheet', () => {
    const v = specVM(model, daiquiri, 'metric', { swap: noSwap, sheetLine: 9 });
    expect(v.swap?.sheet).toBeUndefined();
  });
});

describe('real seed data', () => {
  const model = seedModel();
  test('a drink without a template still shows before and after, and no range', () => {
    const drink = model.drinks.find(
      (d) => !d.spec.templateId && model.abvOf(d.spec) !== undefined,
    )!;
    const v = specVM(model, drink.spec, 'metric', { swap: swapOf(q('swap=0::7.5ml')) });
    const abv = v.balance.figures[0]!;
    expect(abv.change).toContain('→ now');
    expect(abv.track).toBeUndefined();
    expect(v.swap?.templateChange).toBeUndefined();
  });
  test('a line without a role offers the class or the tree neighbours, or says only search is left', () => {
    const bellini = model.byLineage.get('bellini')!.spec;
    const i = bellini.lines.findIndex((l) => l.ingredientId === 'white-peach-puree');
    const s = specVM(model, bellini, 'metric', { swap: noSwap, sheetLine: i }).swap!.sheet!;
    expect(s.rolelessNote).toBeTruthy();
    expect(s.groups.every((g) => g.kind !== 'role')).toBe(true);
    expect(s.noOffers).toBe(s.groups.length === 0);
    const ice = model.byLineage.get('banana-daiquiri')!.spec;
    const j = ice.lines.findIndex((l) => l.ingredientId === 'crushed-ice');
    const t = specVM(model, ice, 'metric', { swap: noSwap, sheetLine: j }).swap!.sheet!;
    expect(t.noOffers).toBe(true);
    const found = specVM(model, ice, 'metric', {
      swap: noSwap,
      sheetLine: j,
      view: { ...initialSpecView, swapQuery: 'ice' },
    }).swap!.sheet!;
    expect(found.search.results.length).toBeGreaterThan(0);
  });
  test('a line with a role offers role groups; a long group is cut and can be expanded', () => {
    const d = model.byLineage.get('bacardi-cocktail')!.spec;
    const s = specVM(model, d, 'metric', { swap: noSwap, sheetLine: 0 }).swap!.sheet!;
    const role = s.groups.find((g) => g.kind === 'role')!;
    expect(role.offers.length).toBe(8);
    expect(role.hidden).toBeGreaterThan(0);
    const all = specVM(model, d, 'metric', {
      swap: noSwap,
      sheetLine: 0,
      view: { ...initialSpecView, swapMore: ['role'] },
    }).swap!.sheet!.groups.find((g) => g.kind === 'role')!;
    expect(all.hidden).toBe(0);
    expect(all.offers.length).toBe(role.offers.length + role.hidden);
  });
  test('unknown acid shows as No figure before and after, without a difference', () => {
    const d = model.byLineage.get('bacardi-cocktail')!.spec;
    const acid = specVM(model, d, 'metric', { swap: swapOf(q('swap=0::45ml')) }).balance
      .figures[2]!;
    expect(acid.change).toBe('Was No figure → now No figure');
    expect(acid.deltaShort).toBeUndefined();
  });
});
