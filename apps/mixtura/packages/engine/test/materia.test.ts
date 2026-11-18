// The general model lives in materia (docs/decisions/shared-model.md): its
// folders must not come back into the engine, and the engine names the
// package by an exact git reference, never a branch.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));

test.each(['ingredients', 'templates', 'specs', 'stock', 'shelf'])(
  'src/%s is not in the engine',
  (folder) => {
    expect(existsSync(`${root}src/${folder}`)).toBe(false);
  },
);

test('materia is pinned to a version tag or a commit', () => {
  const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
  expect(pkg.dependencies['@nexumia-de/materia']).toMatch(
    /^github:nexumia-de\/materia#(v\d+\.\d+\.\d+|[0-9a-f]{40})$/,
  );
});
