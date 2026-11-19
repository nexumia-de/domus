/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known */
// The batch card as data (#37): shelf life and storage as entered, the made-on
// date from the stock record, the state from the engine with today passed in.
import { ROOT_TEMPLATES } from '@mixtura/engine';
import { describe, expect, test } from 'vitest';
import { buildModel } from '../src/screens/browse/model';
import type { Ingredient, SpecData, Template } from '../src/screens/browse/types';
import { shelfVM } from '../src/screens/spec/shelf-vm';
import type { StockRecords } from '../src/stock/state';
import { fixtureIngredients } from './browse-fixture';

const recipe = (id: string, ingredientId: string): SpecData => ({
  id,
  lineageId: id,
  version: 1,
  name: `${id} recipe`,
  status: 'draft',
  lines: [{ ingredientId, amount: 100, unit: 'ml' }],
});
const prepared = (id: string, extra: Partial<Ingredient>): Ingredient => ({
  id,
  name: `${id} prepared`,
  level: 'product',
  parentId: 'syrups',
  prepared: { specId: `u-${id}`, yield: { amount: 100, unit: 'ml' } },
  ...extra,
});
const ingredients: Ingredient[] = [
  ...fixtureIngredients,
  prepared('mine', { shelfLifeDays: 14, storage: 'In the fridge, closed' }),
  prepared('outer', { shelfLifeDays: 30 }),
  prepared('none', {}),
];
const specs = [
  recipe('u-mine', 'simple'),
  { ...recipe('u-outer', 'mine'), lines: [{ ingredientId: 'mine', amount: 100, unit: 'ml' }] },
  recipe('u-none', 'simple'),
];
const built = buildModel({
  ingredients,
  templates: (ROOT_TEMPLATES as Template[]).map((value) => ({ value, origin: 'seed' as const })),
  specs: specs.map((value) => ({ value, origin: 'user' as const })),
  vocabulary: { methods: [], glasses: [] },
  seedVersion: 'test',
});
if (!built.ok) throw new Error(built.reason);
const model = built.model;
const spec = (id: string): SpecData => model.specById.get(id)!;
const rec = (id: string, openedOn?: string, present = true): StockRecords =>
  new Map([[id, { ingredientId: id, present, ...(openedOn && { openedOn }) }]]);

describe('the batch card', () => {
  test('nothing for a spec that is not the recipe of a prepared ingredient', () => {
    expect(shelfVM(model, spec('u-mine'), new Map(), '2026-11-17')?.ingredientId).toBe('mine');
    expect(shelfVM(model, fixtureSpecOf(), new Map(), '2026-11-17')).toBeUndefined();
  });

  test('shelf life and storage are the user words, no batch without a record', () => {
    const vm = shelfVM(model, spec('u-mine'), new Map(), '2026-11-17')!;
    expect(vm.shelfLine).toBe('Shelf life: 14 days');
    expect(vm.storage).toBe('In the fridge, closed');
    expect(vm.batch).toBeUndefined();
  });

  test('no shelf life entered: said once, no number proposed', () => {
    const vm = shelfVM(model, spec('u-none'), rec('none', '2026-11-10'), '2026-11-17')!;
    expect(vm.shelfLine).toContain('No shelf life entered');
    expect(vm.batch).toMatchObject({ status: 'unknown', dates: 'Made on 2026-11-10' });
  });

  test('the states, with today passed in', () => {
    const at = (today: string) =>
      shelfVM(model, spec('u-mine'), rec('mine', '2026-11-01'), today)!.batch!;
    expect(at('2026-11-02')).toMatchObject({
      status: 'fresh',
      dates: 'Made on 2026-11-01 · use by 2026-11-15',
      text: 'Within its shelf life, 13 days left',
    });
    expect(at('2026-11-14')).toMatchObject({ status: 'use-soon', text: 'Use soon: 1 day left' });
    expect(at('2026-11-15').text).toBe('Use soon: the last day of its shelf life is today');
    expect(at('2026-11-17')).toMatchObject({
      status: 'past',
      text: 'Past the date you set by 2 days. Check it before you use it.',
    });
  });

  test('a prepared ingredient made from a shorter-lived one names it', () => {
    const vm = shelfVM(model, spec('u-outer'), rec('outer', '2026-11-01'), '2026-11-02')!;
    expect(vm.shelfLine).toBe('Shelf life: 14 days, set by mine prepared');
    expect(vm.batch!.dates).toContain('use by 2026-11-15');
  });

  test('a record that says out shows no batch; a bad date is said, not guessed', () => {
    expect(
      shelfVM(model, spec('u-mine'), rec('mine', '2026-11-01', false), '2026-11-02')!.batch,
    ).toBeUndefined();
    expect(
      shelfVM(model, spec('u-mine'), rec('mine', '2026-13-45'), '2026-11-02')!.batch,
    ).toMatchObject({
      status: 'invalid',
    });
  });

  test('wording uses no verdict or alarm words', () => {
    const all = ['2026-11-02', '2026-11-14', '2026-11-20']
      .map((d) => shelfVM(model, spec('u-mine'), rec('mine', '2026-11-01'), d)!.batch!.text)
      .join(' ')
      .toLowerCase();
    expect(all).not.toMatch(/expired|spoiled|unsafe|danger|bad|error|warning/);
  });
});

function fixtureSpecOf(): SpecData {
  return model.specById.get('u-mine') ? { ...spec('u-mine'), id: 'unrelated' } : spec('u-mine');
}
