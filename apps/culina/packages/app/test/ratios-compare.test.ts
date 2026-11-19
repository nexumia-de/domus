import { resolveTemplate, SEED_TEMPLATES } from '@culina/engine';
import { expect, test } from 'vitest';
import { compareAmounts } from '../src/ratios/compare';
import { effectiveOf, readVector } from './vector-templates';

const bread = (() => {
  const r = resolveTemplate(SEED_TEMPLATES, 'bread-dough-bakers-percent');
  if (!r.ok) throw new Error('seed');
  return r.template;
})();

const okRows = (view: ReturnType<typeof compareAmounts>) => {
  if (view.state !== 'ok') throw new Error(view.state);
  return view.rows;
};

test('vector ratio-check-pie-dough: 300/180/110 g are 3, 1.8 and 1.1 parts', () => {
  const vector = readVector('ratio-check-pie-dough');
  const template = effectiveOf(vector.inputs.template);
  const lines = vector.inputs.lines as { name: string; g: number }[];
  const rows = okRows(
    compareAmounts(template, Object.fromEntries(lines.map((l) => [l.name, String(l.g)]))),
  );
  const parts = vector.expected.parts as Record<string, number>;
  const delta = vector.expected.delta_parts as Record<string, number>;
  for (const row of rows) {
    expect(Number(row.parts)).toBeCloseTo(parts[row.role] ?? Number.NaN, 2);
    expect(Number(row.diff.replace('−', '-'))).toBeCloseTo(delta[row.role] ?? Number.NaN, 2);
    expect(row.phrase).toBe('');
  }
});

test('vector ratio-check-below-range: water 55 is below 60-70 by 5, salt within', () => {
  const vector = readVector('ratio-check-below-range');
  const template = effectiveOf(vector.inputs.template);
  const rows = okRows(compareAmounts(template, { flour: '1000', water: '550', salt: '20' }));
  expect(rows.find((r) => r.role === 'water')?.phrase).toBe('below the usual range by 5');
  expect(rows.find((r) => r.role === 'salt')?.phrase).toBe('within the usual range');
});

test.each([
  ['8', 'below the usual range by 0.2'],
  ['9', 'within the usual range'],
  ['10', 'within the usual range'],
  ['11', 'above the usual range by 0.2'],
])('bread dough salt, 500 g flour and %s g salt: %s', (salt, phrase) => {
  const rows = okRows(compareAmounts(bread, { flour: '500', salt }));
  expect(rows.find((r) => r.role === 'salt')?.phrase).toBe(phrase);
});

test('roles left blank are "not entered"; ratios without a range have no phrase', () => {
  const rows = okRows(compareAmounts(bread, { flour: '500', water: '310' }));
  expect(rows.find((r) => r.role === 'water')).toMatchObject({
    parts: '62',
    diff: '+2',
    phrase: '',
  });
  expect(rows.find((r) => r.role === 'yeast')?.phrase).toBe('not entered');
});

test('states: empty, number not usable, anchor first', () => {
  expect(compareAmounts(bread, {}).state).toBe('empty');
  expect(compareAmounts(bread, { flour: '  ' }).state).toBe('empty');
  expect(compareAmounts(bread, { flour: '5x0' }).state).toBe('invalid');
  expect(compareAmounts(bread, { water: '300' })).toEqual({
    state: 'needs-anchor',
    anchor: 'flour',
  });
});
