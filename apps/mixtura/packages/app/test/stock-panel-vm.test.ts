/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known */
import { expect, test } from 'vitest';
import { stockPanelVM } from '../src/screens/spec/stock-panel-vm';
import type { StockRecords } from '../src/stock/state';
import { fixtureModel } from './browse-fixture';

const model = fixtureModel();
const rec = (...ids: string[]): StockRecords =>
  new Map(ids.map((id) => [id, { ingredientId: id, present: true }]));
const spec = (name: string) => model.drinks.find((d) => d.spec.name === name)!.spec;

test('nothing in stock: the panel says so and has no rows or tag', () => {
  const vm = stockPanelVM(model, spec('Daiquiri'), rec())!;
  expect(vm.kind).toBe('none');
  expect(vm.rows).toEqual([]);
});

test('a makeable drink: every line is "Have", the tag says Makeable', () => {
  const vm = stockPanelVM(model, spec('Daiquiri'), rec('rum', 'lime', 'simple'))!;
  expect(vm.kind).toBe('makeable');
  expect(vm.tag).toBe('Makeable');
  expect(vm.rows.map((r) => r.state)).toEqual(['have', 'have', 'have']);
});

test('a stocked descendant is named with the ingredient the line asks for', () => {
  const vm = stockPanelVM(model, spec('Daiquiri'), rec('rum', 'lime', 'simple'))!;
  expect(vm.rows[0]!.text).toMatch(/^Have: /);
});

test('a missing line names the ingredient and carries it for Mark in stock and Buy Next', () => {
  const vm = stockPanelVM(model, spec('Martini'), rec('gin'))!;
  expect(vm.kind).toBe('missing');
  const missing = vm.rows.filter((r) => r.state === 'missing');
  expect(missing.length).toBeGreaterThan(0);
  expect(missing[0]!.missingId).toBeTruthy();
  expect(vm.tag.startsWith('Missing')).toBe(true);
  expect(missing[0]!.text.startsWith('Missing: ')).toBe(true);
});

test('results follow the records object', () => {
  const a = rec('rum', 'lime');
  expect(stockPanelVM(model, spec('Daiquiri'), a)!.kind).toBe('missing');
  expect(stockPanelVM(model, spec('Daiquiri'), rec('rum', 'lime', 'simple'))!.kind).toBe(
    'makeable',
  );
});

test('wording uses no verdict words', () => {
  const vm = stockPanelVM(model, spec('Martini'), rec('gin'))!;
  const text = [vm.tag, ...vm.rows.map((r) => r.text)].join(' ').toLowerCase();
  expect(text).not.toMatch(/error|wrong|fail|bad|invalid/);
});
