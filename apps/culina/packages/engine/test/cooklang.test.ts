// Properties of the Cooklang reader beyond the vectors: it never throws, and what the writer
// writes the reader reads back line for line.
import { expect, test } from 'vitest';
import {
  componentToCooklang,
  cooklangParts,
  dishToCooklang,
  hasSections,
  importDish,
  ingredientUses,
  parseCooklang,
} from '../src/index';
import { validators } from './validators';
import { loadVectors } from './vector-files';

const PIECES = [
  '@',
  '#',
  '~',
  '?',
  '{',
  '}',
  '(',
  ')',
  '%',
  '--',
  '[-',
  '-]',
  '>',
  '=',
  '\\',
  '\n',
  '\n\n',
  ' ',
  'salt',
  '1/2',
  './x/y',
  '---',
  '1',
  'a b',
];

test('the reader never throws, whatever the text (every pair and triple of markup pieces)', () => {
  let runs = 0;
  for (const a of PIECES) {
    for (const b of PIECES) {
      for (const c of PIECES) {
        const doc = parseCooklang(`${a}${b}${c}`);
        expect(Array.isArray(doc.blocks)).toBe(true);
        runs++;
      }
    }
  }
  expect(runs).toBe(PIECES.length ** 3);
});

test('a written file reads back with the same ingredient names and amounts', () => {
  const names: Record<string, string> = { a: 'Flour', b: 'Olive oil', c: 'Egg' };
  const result = componentToCooklang(
    {
      id: 'x',
      name: 'Test',
      lines: [
        { ref: { kind: 'ingredient', id: 'a' }, amount: { value: 250.5, unit: 'g' } },
        { ref: { kind: 'ingredient', id: 'b' }, amount: { value: 2, unit: 'tbsp' }, note: 'cold' },
        { ref: { kind: 'ingredient', id: 'c' }, amount: { value: 3, unit: 'count' } },
      ],
      version: { family: 'x' },
    },
    { ingredientName: (id) => names[id] ?? id, componentName: (id) => id, facts: {} },
  );
  const uses = ingredientUses(parseCooklang(result.text));
  expect(uses.map((u) => u.name)).toEqual(['Flour', 'Olive oil', 'Egg']);
  expect(uses.map((u) => [u.quantity?.value, u.quantity?.unit, u.note])).toEqual([
    [250.5, 'g', undefined],
    [2, 'tbsp', 'cold'],
    [3, undefined, undefined],
  ]);
});

test('what the dish import makes is valid against the stored schemas', () => {
  const vectors = loadVectors('cooklang').filter(
    (v) => v.inputs.kind === 'cooklang_import_dish' && v.error_code === undefined,
  );
  expect(vectors.length).toBeGreaterThanOrEqual(3);
  for (const v of vectors) {
    const e = v.expected as { dish: unknown; components: unknown[] };
    expect(validators.dishes(e.dish), `${v.id} dish`).toBe(true);
    for (const c of e.components) expect(validators.components(c), `${v.id} component`).toBe(true);
  }
});

test('a dish written to Cooklang and read back gives the same components, note and assembly', () => {
  const component = (id: string, name: string, ingredient: string) => ({
    id,
    name,
    lines: [
      {
        ref: { kind: 'ingredient' as const, id: ingredient },
        amount: { value: 10, unit: 'g' as const },
      },
    ],
    version: { family: id },
  });
  const parts = [component('c1', 'Dough = base -- thin', 'a'), component('c2', 'Sauce', 'b')];
  const written = dishToCooklang(
    {
      name: 'Pizza',
      note: 'For two.',
      slots: parts.map((c) => ({ role: 'main', ref: { kind: 'component' as const, id: c.id } })),
      version: { family: 'd' },
    },
    {
      ingredientName: (id) => id,
      componentName: (id) => id,
      component: (id) => parts.find((c) => c.id === id),
      facts: {},
      assembly: ['Top and bake.'],
      assemblyName: 'Assembly',
    },
  );
  expect(written.lost).toContain('characters');
  const doc = parseCooklang(written.text);
  expect(hasSections(doc)).toBe(true);
  const withLines = cooklangParts(doc).filter((p) => p.uses.length > 0);
  expect(withLines.map((p) => p.name)).toEqual(['Dough = base - thin', 'Sauce']);
  const decisions = ingredientUses(doc).map((u) => ({
    target: { kind: 'ingredient' as const, id: u.name },
    amount: { mode: 'given' as const },
  }));
  const back = importDish(doc, decisions, {
    id: 'd2',
    name: 'Pizza',
    date: '2026-11-23',
    change: 'Imported from Pizza.cook',
    components: withLines.map((p, i) => ({ id: `n${i}`, name: p.name ?? 'Pizza', role: 'main' })),
    facts: () => ({}),
  });
  if (!back.ok) throw new Error(back.error.code);
  expect(back.dish.note).toBe('For two.');
  expect(back.dish.steps).toEqual([{ note: 'Top and bake.' }]);
  expect(back.components.map((c) => c.lines)).toEqual(parts.map((c) => c.lines));
});
