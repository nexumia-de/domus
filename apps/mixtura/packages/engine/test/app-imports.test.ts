// The app may import the engine only through its entry point (and the seed
// data files). The lint rule in eslint.config.js must fail on deep imports,
// so it cannot be removed without a red test; the real app sources must pass.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
const eslint = new ESLint({ cwd: root });

async function rules(name: string) {
  const [result] = await eslint.lintText(readFileSync(`${fixtures}${name}.ts.txt`, 'utf8'), {
    filePath: `${root}packages/app/src/probe.ts`,
  });
  return (result?.messages ?? []).map((m) => m.ruleId);
}

test.each(['app-deep-import', 'app-relative-import'])('%s fails the app lint', async (name) => {
  expect(await rules(name)).toContain('no-restricted-imports');
});

test('the entry point and the seed data files are allowed', async () => {
  expect(await rules('app-entry-import')).not.toContain('no-restricted-imports');
});

test('the app package.json depends on the engine only by name', () => {
  const pkg = JSON.parse(readFileSync(`${root}packages/app/package.json`, 'utf8'));
  expect(pkg.dependencies['@mixtura/engine']).toBeDefined();
});
