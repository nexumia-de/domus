/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixtures are known; a missing entry should fail the test */
import { describe, expect, test } from 'vitest';
import { parseHash } from '../src/router';
import { batchVM } from '../src/screens/spec/batch-vm';
import { scaledLine, servingsOf, specAddress } from '../src/screens/spec/servings';
import { specVM } from '../src/screens/spec/view-model';
import { seedModel } from './browse-fixture';

const q = (s: string): URLSearchParams => new URLSearchParams(s);

describe('servings in the address', () => {
  test('1 to 12 whole drinks, anything else is 1', () => {
    expect(servingsOf(q('servings=3'))).toBe(3);
    expect(servingsOf(q('servings=12'))).toBe(12);
    for (const bad of ['', 'servings=0', 'servings=13', 'servings=2.5', 'servings=x'])
      expect(servingsOf(q(bad))).toBe(1);
  });
  test('the address keeps other parameters and drops servings=1', () => {
    const route = parseHash('#/drinks/daiquiri?q=rum');
    expect(specAddress(route, 3, null)).toBe('#/drinks/daiquiri?q=rum&servings=3');
    expect(specAddress(route, 3, 'batch')).toBe('#/drinks/daiquiri?q=rum&servings=3&sheet=batch');
    expect(specAddress(parseHash('#/drinks/daiquiri?servings=3&sheet=batch'), 1, null)).toBe(
      '#/drinks/daiquiri',
    );
  });
});

describe('scaling a line for display', () => {
  const line = { ingredientId: 'x', amount: 22.5, unit: 'ml' };
  test('amounts are multiplied, the unit is kept, one serving is unchanged', () => {
    expect(scaledLine(line, 1)).toBe(line);
    expect(scaledLine(line, 3)).toMatchObject({ amount: 67.5, unit: 'ml' });
  });
  test('a range line scales both ends', () => {
    expect(scaledLine({ ...line, amountMax: 30 }, 2)).toMatchObject({ amount: 45, amountMax: 60 });
  });
  test('counted units round up to whole units, never below 1', () => {
    expect(scaledLine({ ingredientId: 'x', amount: 1.5, unit: 'whole' }, 3).amount).toBe(5);
    expect(scaledLine({ ingredientId: 'x', amount: 0.25, unit: 'leaf' }, 2).amount).toBe(1);
    expect(scaledLine({ ingredientId: 'x', amount: 1.5, unit: 'whole' }, 1).amount).toBe(1.5);
  });
});

describe('the spec screen for several drinks', () => {
  const model = seedModel();
  const daiquiri = model.byLineage.get('daiquiri')!.spec;
  test('amounts scale, the figures stay those of one drink', () => {
    const one = specVM(model, daiquiri, 'metric');
    const three = specVM(model, daiquiri, 'metric', { servings: 3 });
    expect(three.lines.map((l) => l.amount)).toEqual(['180 ml', '67.5 ml', '67.5 ml']);
    expect(three.balance.figures.map((f) => f.valueText)).toEqual(
      one.balance.figures.map((f) => f.valueText),
    );
    expect(three.balance.volume).toBe(one.balance.volume);
    expect(one.batch).toBeUndefined();
  });
  test('US display of scaled amounts', () => {
    expect(specVM(model, daiquiri, 'us', { servings: 2 }).lines[0]?.amount).toBe('4 oz');
  });
});

describe('the batch sheet', () => {
  const model = seedModel();
  const batch = (id: string, servings: number, system: 'metric' | 'us' = 'metric') => {
    const spec = model.byLineage.get(id)!.spec;
    return batchVM(model.tree, spec.method, spec.lines, servings, system, model.ingredientName);
  };

  test('water, total, pour, yield and the dilution used', () => {
    const vm = batch('daiquiri', 4);
    expect(vm.title).toBe('Batch of 4 drinks');
    const rows = Object.fromEntries(vm.rows.map((r) => [r.label, r.value]));
    expect(rows['Pour per serving']).toBe('131 ml');
    expect(rows['Total volume']).toBe('525 ml');
    expect(rows['Yield']).toBe('4 servings');
    expect(rows['Water to add']).toMatch(/^\d+ ml$/);
    expect(vm.lines.map((l) => l.amount)).toEqual(['240 ml', '90 ml', '90 ml']);
    expect(vm.notes.join(' ')).toMatch(
      /Water is the dilution of shaking: \d+ % of the mix \(from a secondary source\)/,
    );
  });

  test('shelf life is unknown unless the data has it, naming what is missing', () => {
    const row = batch('daiquiri', 2).rows.find((r) => r.label === 'Shelf life')!;
    expect(row.value).toBe('Unknown');
    expect(row.note).toMatch(/^No shelf life stored for /);
  });

  test('a top is poured at the glass; a counted line without a volume is not in the totals', () => {
    const vm = batch('mojito', 3);
    expect(vm.notes.join(' ')).toMatch(/Poured at the glass, not in the batch: Club soda/);
    expect(vm.notes.join(' ')).toMatch(/Not in the totals \(no volume known\): Mint/);
    const mint = vm.lines.find((l) => l.name === 'Mint')!;
    expect(mint.amount).toBe('18 sprigs');
    expect(mint.note).toBe('not in the totals');
    expect(vm.lines.some((l) => l.name === 'Club soda')).toBe(false);
  });

  test('a drink without a method known to the model has no batch and says why', () => {
    const spec = { ...model.byLineage.get('daiquiri')!.spec, method: undefined };
    const vm = batchVM(model.tree, spec.method, spec.lines, 2, 'metric', model.ingredientName);
    expect(vm.failure).toMatch(/needs a method/);
  });

  test('the batch is part of the spec view model only while the sheet is open', () => {
    const spec = model.byLineage.get('daiquiri')!.spec;
    expect(specVM(model, spec, 'metric', { servings: 2, batch: true }).batch?.title).toBe(
      'Batch of 2 drinks',
    );
  });
});
