import { expect, test } from 'vitest';
import { assembleSeed } from '../seed-assemble.mjs';
import { loadSeed, parseSeed, StoreError } from '../src/store';
import { validateEntity } from '../src/store/validate';
import { seed } from './helpers';

test('the fixture seed validates against the schemas', () => {
  for (const i of seed.ingredients) validateEntity('ingredient', i);
  for (const s of seed.specs) validateEntity('spec', s);
  expect(seed.ingredients.length).toBeGreaterThanOrEqual(5);
  expect(seed.specs.length).toBe(2);
});

test('the assembled seed (what the build ships) has the expected shape and validates', () => {
  const real = parseSeed(JSON.parse(JSON.stringify(assembleSeed())));
  expect(real.seedVersion).toMatch(/^bar-assistant-[0-9a-f]{7}$/);
  expect(real.ingredients).toHaveLength(296);
  expect(real.specs).toHaveLength(635);
  expect(real.specs.filter((s) => s.templateId)).toHaveLength(107);
  expect(real.templates.map((t) => t.id).sort()).toEqual(
    ['daiquiri', 'flip', 'highball', 'martini', 'old-fashioned', 'sidecar'].sort(),
  );
  expect(real.vocabulary.methods.length).toBeGreaterThan(3);
  expect(real.attribution?.notice).toContain('Bar Assistant');
  for (const i of real.ingredients) validateEntity('ingredient', i);
  for (const t of real.templates) validateEntity('template', t);
  for (const s of real.specs) validateEntity('spec', s);
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
