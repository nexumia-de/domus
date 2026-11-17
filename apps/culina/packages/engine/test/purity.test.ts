// The engine's purity rule and the app's deep-import rule must fail on
// these sources, so they cannot be removed from eslint.config.js silently.
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const eslint = new ESLint({ cwd: root });

async function rules(path: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath: `${root}${path}` });
  return (result?.messages ?? []).map((m) => m.ruleId);
}

const engine = (source: string) => rules('packages/engine/src/probe.ts', source);
const app = (source: string) => rules('packages/app/src/probe.ts', source);

test.each([
  ['export const t = (): number => Date.now();\n', 'no-restricted-globals'],
  ['export const t = (): unknown => document.body;\n', 'no-restricted-globals'],
  ['export const r = (): number => Math.random();\n', 'no-restricted-syntax'],
  [
    "import { appTitle } from '@culina/app';\nexport const t = appTitle;\n",
    'no-restricted-imports',
  ],
  ['export const l = (): void => console.log(1);\n', 'no-console'],
])('engine source %# fails with %s', async (source, rule) => {
  expect(await engine(source)).toContain(rule);
});

test('pure engine code passes', async () => {
  expect(await engine('export const one = (): number => 1;\n')).toEqual([]);
});

test('the app may not import the engine past its entry point', async () => {
  expect(
    await app("import { x } from '@culina/engine/src/x.ts';\nexport const y = x;\n"),
  ).toContain('no-restricted-imports');
  expect(
    await app("import { engineName } from '@culina/engine';\nexport const y = engineName;\n"),
  ).not.toContain('no-restricted-imports');
});
