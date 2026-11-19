// The general model lives in materia (docs/decisions/shared-model.md): its
// folders must not come back into the engine, and the engine takes the
// package from this repository (packages/model).
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));

test.each(['ingredients', 'templates', 'specs', 'stock', 'shelf'])(
  'src/%s is not in the engine',
  (folder) => {
    expect(existsSync(`${root}src/${folder}`)).toBe(false);
  },
);

test('materia is the package of this repository', () => {
  const entry = realpathSync(createRequire(import.meta.url).resolve('@nexumia-de/materia'));
  expect(entry.replaceAll('\\', '/')).toMatch(/\/packages\/model\/dist\/[^/]+$/);
});
