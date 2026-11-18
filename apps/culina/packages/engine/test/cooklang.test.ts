// Properties of the Cooklang reader beyond the vectors: it never throws, and what the writer
// writes the reader reads back line for line.
import { expect, test } from 'vitest';
import { componentToCooklang, ingredientUses, parseCooklang } from '../src/index';

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
