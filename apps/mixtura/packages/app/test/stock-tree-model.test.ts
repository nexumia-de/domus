/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixture is known */
import { buildTree } from '@mixtura/engine';
import { expect, test } from 'vitest';
import {
  clearTargets,
  markTargets,
  buildStockTree,
  countPresent,
  firstMatch,
  viewRows,
  type Show,
} from '../src/screens/stock/tree-model';
import type { StockRecords } from '../src/stock/state';
import { fixtureIngredients } from './browse-fixture';

const built = buildTree([...fixtureIngredients]);
if (!built.ok) throw new Error('fixture tree');
const tree = built.tree;
const rec = (...ids: string[]): StockRecords =>
  new Map(ids.map((id) => [id, { ingredientId: id, present: true }]));
const roots = (records: StockRecords) =>
  buildStockTree(tree, records, new Map([['gin', 2]]), 'Other');
const ids = (rows: { node: { id: string } }[]): string[] => rows.map((r) => r.node.id);
const none = new Set<string>();
const view = (r: StockRecords, q = '', show: Show = 'all', open: Set<string> = none) =>
  viewRows(roots(r), { q, show, expanded: open });

test('groups are the roots with children by name; childless roots go into one group at the end', () => {
  const all = roots(rec());
  expect(all.map((n) => n.name)).toEqual([
    'Fortified wine',
    'Juices',
    'Spirits',
    'Syrups',
    'Other',
  ]);
  expect(all.at(-1)!.children.map((n) => n.name)).toEqual(['Crème de Cacao', 'Soda']);
  expect(all.at(-1)!.synthetic).toBe(true);
});

test('counts are over leaves: marked of total, a marked type is not a leaf', () => {
  const spirits = roots(rec('london-gin', 'cognac')).find((n) => n.id === 'spirits')!;
  // leaves: london-gin, rum (type without children), cognac
  expect([spirits.marked, spirits.leaves]).toEqual([2, 3]);
  const typeOnly = roots(rec('gin')).find((n) => n.id === 'spirits')!;
  expect([typeOnly.marked, typeOnly.leaves]).toEqual([0, 3]);
  expect(typeOnly.children.find((n) => n.id === 'gin')!.present).toBe(true);
  expect(countPresent(roots(rec('gin', 'cognac', 'lime')))).toBe(3);
});

test('a record with present false is known to be out, no record is not tracked', () => {
  const records: StockRecords = new Map([['cognac', { ingredientId: 'cognac', present: false }]]);
  const spirits = roots(records).find((n) => n.id === 'spirits')!;
  const cognac = spirits.children.find((n) => n.id === 'cognac')!;
  expect([cognac.present, cognac.tracked]).toEqual([false, true]);
  expect(spirits.children.find((n) => n.id === 'rum')!.tracked).toBe(false);
});

test('without a search the groups are closed until opened', () => {
  expect(ids(view(rec()).rows)).toEqual(['wines', 'juices', 'spirits', 'syrups', '__other']);
  const open = view(rec(), '', 'all', new Set(['spirits'])).rows;
  expect(ids(open)).toEqual([
    'wines',
    'juices',
    'spirits',
    'cognac',
    'gin',
    'rum',
    'syrups',
    '__other',
  ]);
  expect(open.find((r) => r.node.id === 'gin')!.expanded).toBe(false);
});

test('a search shows the matches with their groups open, and everything below a matching name', () => {
  const { rows, matches } = view(rec(), 'gin');
  expect(ids(rows)).toEqual(['spirits', 'gin', 'london-gin']);
  expect(matches.map((n) => n.id)).toEqual(['gin', 'london-gin']);
  expect(rows.every((r) => r.expanded !== false)).toBe(true);
  expect(ids(view(rec(), 'CREME').rows)).toEqual(['__other', 'creme']);
  expect(view(rec(), 'zzz').rows).toEqual([]);
});

test('the show choice keeps what is in stock or not, with the groups above it', () => {
  const r = rec('london-gin', 'lime');
  expect(ids(view(r, '', 'in').rows)).toEqual(['juices', 'lime', 'spirits', 'gin', 'london-gin']);
  const out = ids(view(r, '', 'out').rows);
  expect(out).not.toContain('lime');
  expect(out).toContain('cognac');
});

test('quick entry: an exact name beats a prefix, a prefix beats other hits', () => {
  expect(firstMatch(roots(rec()), 'gin')!.id).toBe('gin');
  expect(firstMatch(roots(rec()), 'london')!.id).toBe('london-gin');
  expect(firstMatch(roots(rec()), 'soda')!.id).toBe('soda');
  expect(firstMatch(roots(rec()), 'nothing')).toBeUndefined();
});

test('Mark All Visible takes leaves not yet marked; Clear Visible takes every marked match', () => {
  const { matches } = view(rec('gin'), 'gin');
  expect(markTargets(matches).map((n) => n.id)).toEqual(['london-gin']);
  expect(clearTargets(matches).map((n) => n.id)).toEqual(['gin']);
});
