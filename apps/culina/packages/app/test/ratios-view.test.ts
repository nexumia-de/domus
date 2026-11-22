import type { RatioTemplate } from '@culina/engine';
import { SEED_TEMPLATES } from '@culina/engine';
import { expect, test } from 'vitest';
import { groupFamilies, relatives } from '../src/ratios/families';
import { shortRatio } from '../src/ratios/format';
import { formatNumber } from '../src/shared/mass';
import { parseEntry } from '../src/shared/parse';
import { filterTemplates } from '../src/ratios/search';
import { ratioRole, templateName, templateNote, templateSource } from '../src/ratios/names';
import { stringsDe, stringsEn } from '../src/strings';
import { must } from './must';

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

// Fixtures with derivatives; the shipped seed has only two small families (docs/behaviour.md).
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

test('the seed has two families, the bread dough and the roux; every other template stands alone', () => {
  const families = groupFamilies(SEED_TEMPLATES);
  const roots = SEED_TEMPLATES.filter((t) => t.parentId === undefined).map((t) => t.id);
  expect(families.map((f) => f.rootId)).toEqual(roots);
  const larger = families.filter((f) => f.members.length > 1);
  expect(larger.map((f) => [f.name, f.members.map((m) => m.id)])).toEqual([
    ['Bread dough, ratio', ['bread-dough-ratio', 'bread-dough-bakers-percent']],
    ['Roux', ['roux', 'roux-whole-butter']],
  ]);
});

test('relatives: parent and direct variations with their ids, for the links of the card', () => {
  const middle = relatives(FIXTURE, 'dough-herb');
  expect(middle.parent?.id).toBe('dough');
  expect(middle.children.map((c) => c.id)).toEqual(['dough-herb-garlic']);
  expect(relatives(FIXTURE, 'dough').parent).toBeUndefined();
  expect(relatives(FIXTURE, 'dough').children.map((c) => c.id)).toEqual(['dough-herb']);
  expect(relatives(FIXTURE, 'dough-herb-garlic').children).toEqual([]);
  expect(relatives(SEED_TEMPLATES, 'pie-dough')).toEqual({ children: [] });
  const roux = relatives(SEED_TEMPLATES, 'roux');
  expect([roux.parent, roux.children.map((c) => c.id)]).toEqual([undefined, ['roux-whole-butter']]);
  expect(relatives(SEED_TEMPLATES, 'roux-whole-butter').parent?.id).toBe('roux');
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
    roles: 'Flour : Fat : Water',
  });
  expect(formatNumber(55.6)).toBe('55.6');
  expect(formatNumber((100 * 55.6) / 100)).toBe('55.6');
  expect(formatNumber(2.95)).toBe('2.95');
});

// The shipped ratios in the user's language: names, notes and role words from the strings, the source
// as author, title and page (never the repository pointer).

test('every shipped ratio has an English and a German name, and a role word for each role', () => {
  const ids = SEED_TEMPLATES.map((t) => t.id).sort();
  expect(Object.keys(stringsEn.ratios.seed).sort()).toEqual(ids);
  expect(Object.keys(stringsDe.ratios.seed).sort()).toEqual(ids);
  for (const t of SEED_TEMPLATES) {
    expect(stringsEn.ratios.seed[t.id]?.name, t.id).toBe(t.name);
    // "Vinaigrette" is the same word in both languages.
    if (t.id !== 'vinaigrette') expect(stringsDe.ratios.seed[t.id]?.name, t.id).not.toBe(t.name);
  }
  const roles = new Set(
    SEED_TEMPLATES.flatMap((t) => [
      ...(t.parts ?? []).map((p) => p.role),
      ...(t.changes ?? []).flatMap((c) => (c.op === 'swap' ? [] : [c.role])),
    ]),
  );
  for (const role of roles) {
    expect((stringsEn.roles as Record<string, string>)[role], `en ${role}`).toBeTruthy();
    expect((stringsDe.roles as Record<string, string>)[role], `de ${role}`).toBeTruthy();
    expect(ratioRole(role)).toBe((stringsEn.roles as Record<string, string>)[role]);
  }
  expect(stringsDe.roles.flour).toBe('Mehl');
});

test('the notes of the shipped ratios carry no id and no repository path, in both languages', () => {
  const ids = new Set(SEED_TEMPLATES.map((t) => t.id));
  for (const strings of [stringsEn, stringsDe]) {
    for (const [id, entry] of Object.entries(strings.ratios.seed)) {
      expect(entry.note ?? '', id).not.toMatch(/docs\/|\.md|excerpt/i);
      for (const other of ids) expect(entry.note ?? '', id).not.toContain(other);
    }
  }
});

test('the source of a card is author, title and page; the repository pointer is never shown', () => {
  for (const t of SEED_TEMPLATES) {
    expect(t.references?.length, t.id).toBeGreaterThan(0);
    expect(t.source, t.id).toMatch(/^docs\/ratios\.md/);
    expect(templateSource(t), t.id).not.toContain('docs/');
  }
  const bread = must(SEED_TEMPLATES.find((t) => t.id === 'bread-dough-ratio'));
  expect(templateSource(bread)).toBe('Source: Michael Ruhlman, Ratio, p. 17');
  expect(stringsDe.ratios.reference('Michael Ruhlman', 'Ratio', '17')).toBe(
    'Michael Ruhlman, Ratio, S. 17',
  );
  // A ratio of the user's own is shown as typed and has no source line.
  const own = root('mine', 'My dough');
  expect(templateName(own)).toBe('My dough');
  expect(templateNote({ id: 'mine', note: 'As typed.' })).toBe('As typed.');
  expect(templateSource(own)).toBeUndefined();
});
