// The vector tests reach the engine only through the public entry.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const dir = fileURLToPath(new URL('./', import.meta.url));
const files = [
  'amounts.test.ts',
  'balance.test.ts',
  'batch.test.ts',
  'classics.test.ts',
  'ingredients-vectors.test.ts',
  'stock-vectors.test.ts',
  'stock-random.test.ts',
  'stock-seed.test.ts',
  'templates.test.ts',
  'helpers/balance-vectors.ts',
];

test.each(files)('%s imports the engine from the entry point only', (f) => {
  const text = readFileSync(`${dir}${f}`, 'utf8');
  const engine = [...text.matchAll(/from '((?:\.\.\/)+src[^']*)'/g)].map((m) => m[1] as string);
  expect(engine.length).toBeGreaterThan(0);
  for (const path of engine) expect(path, f).toMatch(/\/src\/index$/);
});

test('every vector folder has a test in the list', () => {
  const folders = readdirSync(`${dir}../vectors`, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  expect(folders).toEqual([
    'amounts',
    'balance',
    'batch',
    'classics',
    'ingredients',
    'non-alcoholic',
    'shelf',
    'specs',
    'stock',
    'templates',
    'variants',
  ]);
});
