import type { RatioTemplate } from '@culina/engine';
import { SEED_TEMPLATES } from '@culina/engine';
import { expect, test } from 'vitest';
import { groupFamilies, relatives } from '../src/ratios/families';
import { shortRatio } from '../src/ratios/format';
import { formatNumber } from '../src/shared/mass';
import { parseEntry } from '../src/shared/parse';
import { filterTemplates } from '../src/ratios/search';

const root = (id: string, name: string): RatioTemplate => ({
  id,
  name,
  source: 'user',
  anchor: 'flour',
  parts: [
    { role: 'flour', parts: 3 },
    { role: 'water', parts: 2 },
  ],
});
const child = (id: string, name: string, parentId: string, role = 'herb'): RatioTemplate => ({
  id,
  name,
  source: 'user',
  parentId,
  changes: [{ op: 'add', role, parts: 1 }],
});

// Fixtures with derivatives; the shipped seed has none (docs/behaviour.md).
const FIXTURE = [
  root('dough', 'Dough'),
  root('custard', 'Custard'),
  child('dough-herb', 'Herb dough', 'dough'),
  child('dough-herb-garlic', 'Herb and garlic dough', 'dough-herb', 'garlic'),
  child('custard-vanilla', 'Vanilla custard', 'custard'),
];

test('families are named after the root, roots first, then variations in input order', () => {
  const families = groupFamilies(FIXTURE);
  expect(families.map((f) => [f.name, f.members.map((m) => m.id)])).toEqual([
    ['Dough', ['dough', 'dough-herb', 'dough-herb-garlic']],
    ['Custard', ['custard', 'custard-vanilla']],
  ]);
});

test('a variation listed before its root still comes after it', () => {
  const families = groupFamilies([child('a-x', 'A x', 'a'), root('a', 'A')]);
  expect(families[0]?.members.map((m) => m.id)).toEqual(['a', 'a-x']);
});

test('a template whose chain cannot be resolved is a family of its own', () => {
  const families = groupFamilies([root('a', 'A'), child('b', 'B', 'nowhere')]);
  expect(families.map((f) => f.rootId)).toEqual(['a', 'b']);
});

test('every seed template is the root of its own family, in seed order', () => {
  const families = groupFamilies(SEED_TEMPLATES);
  expect(families.map((f) => f.rootId)).toEqual(SEED_TEMPLATES.map((t) => t.id));
  expect(families.every((f) => f.members.length === 1)).toBe(true);
});

test('relatives: parent and direct variations with their ids, for the links of the card', () => {
  const middle = relatives(FIXTURE, 'dough-herb');
  expect(middle.parent?.id).toBe('dough');
  expect(middle.children.map((c) => c.id)).toEqual(['dough-herb-garlic']);
  expect(relatives(FIXTURE, 'dough').parent).toBeUndefined();
  expect(relatives(FIXTURE, 'dough').children.map((c) => c.id)).toEqual(['dough-herb']);
  expect(relatives(FIXTURE, 'dough-herb-garlic').children).toEqual([]);
  expect(relatives(SEED_TEMPLATES, 'pie-dough')).toEqual({ children: [] });
  expect(relatives(FIXTURE, 'nope')).toEqual({ children: [] });
});

test('search: case-insensitive substring of the name, trimmed, empty keeps all', () => {
  const ids = (q: string) => filterTemplates(SEED_TEMPLATES, q).map((t) => t.id);
  expect(ids('')).toHaveLength(SEED_TEMPLATES.length);
  expect(ids('   ')).toHaveLength(SEED_TEMPLATES.length);
  expect(ids('  PIE ')).toEqual(['pie-dough']);
  expect(ids('roux')).toEqual(['roux', 'roux-whole-butter']);
  expect(ids('dough')).toContain('bread-dough-ratio');
  expect(ids('zzz')).toEqual([]);
});

test('number entry: 500, 500.5, 500,5 and padding are numbers; everything else is not', () => {
  expect(parseEntry('500')).toEqual({ kind: 'ok', value: 500 });
  expect(parseEntry(' 500.5 ')).toEqual({ kind: 'ok', value: 500.5 });
  expect(parseEntry('500,5')).toEqual({ kind: 'ok', value: 500.5 });
  expect(parseEntry('')).toEqual({ kind: 'empty' });
  expect(parseEntry('   ')).toEqual({ kind: 'empty' });
  for (const bad of [
    'abc',
    '0',
    '0.0',
    '-5',
    '1e3',
    '1,000.5',
    '5 0',
    '.5',
    '5.',
    '+5',
    '1/2',
    'Infinity',
    '9'.repeat(400),
  ]) {
    expect(parseEntry(bad), bad).toEqual({ kind: 'invalid' });
  }
});

test('short form in template order and trimmed numbers', () => {
  expect(
    shortRatio([
      { role: 'flour', parts: 3 },
      { role: 'fat', parts: 2 },
      { role: 'water', parts: 1 },
    ]),
  ).toEqual({
    numbers: '3 : 2 : 1',
    roles: 'flour : fat : water',
  });
  expect(formatNumber(55.6)).toBe('55.6');
  expect(formatNumber((100 * 55.6) / 100)).toBe('55.6');
  expect(formatNumber(2.95)).toBe('2.95');
});
