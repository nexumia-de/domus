import { expect, test } from 'vitest';
import { emptySeed, loadSeed, parseSeed, StoreError } from '../src/store';
import { validateEntity } from '../src/store/validate';
import { seed } from './helpers';

test('the fixture seed validates against the schemas', () => {
  for (const i of seed.ingredients) validateEntity('ingredient', i);
  for (const s of seed.specs) validateEntity('spec', s);
  expect(seed.ingredients.length).toBeGreaterThanOrEqual(5);
  expect(seed.specs.length).toBe(2);
});

test('the bundled seed file has the expected shape', async () => {
  const { readFileSync } = await import('node:fs');
  const file = JSON.parse(readFileSync(new URL('../src/seed/seed.json', import.meta.url), 'utf8'));
  expect(parseSeed(file).seedVersion).toBe(emptySeed.seedVersion);
});

test.each([
  ['not an object', 1],
  ['no version', { ingredients: [], templates: [], specs: [], affinities: [] }],
  ['a list missing', { seedVersion: 'x', ingredients: [], templates: [], specs: [] }],
  [
    'an entry without id',
    { seedVersion: 'x', ingredients: [{}], templates: [], specs: [], affinities: [] },
  ],
  [
    'a duplicate id',
    {
      seedVersion: 'x',
      ingredients: [{ id: 'a' }, { id: 'a' }],
      templates: [],
      specs: [],
      affinities: [],
    },
  ],
])('a malformed seed is refused: %s', (_name, data) => {
  expect(() => parseSeed(data)).toThrow(StoreError);
});

test('loadSeed reads through fetch and reports failures as seed errors', async () => {
  const ok = async () => new Response(JSON.stringify(seed));
  expect((await loadSeed(ok as typeof fetch)).seedVersion).toBe('fixture-1');
  const missing = async () => new Response('', { status: 404 });
  await expect(loadSeed(missing as typeof fetch)).rejects.toMatchObject({ kind: 'seed' });
  const offline = async () => {
    throw new TypeError('Failed to fetch');
  };
  await expect(loadSeed(offline as typeof fetch)).rejects.toMatchObject({ kind: 'seed' });
});
