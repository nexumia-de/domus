// Keeps the purity rule of AGENTS.md in force: asks ESLint, with the
// repository's own configuration, to judge engine code that reaches for
// the clock, chance or the host.
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const eslint = new ESLint({ cwd: root });

async function rulesBroken(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: file });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'parse');
}

const engineFile = 'packages/engine/src/probe.ts';

describe('the engine is pure', () => {
  it.each([
    ['the clock', 'export const t = Date.now();', 'no-restricted-globals'],
    ['chance', 'export const r = Math.random();', 'no-restricted-syntax'],
    ['the network', "export const p = fetch('/x');", 'no-restricted-globals'],
    ['storage', 'export const s = localStorage.length;', 'no-restricted-globals'],
    ['logging', "console.log('x');", 'no-console'],
    ['the app', "import '@emptio/app';", 'no-restricted-imports'],
  ])('rejects %s', async (_what, code, rule) => {
    expect(await rulesBroken(code, engineFile)).toContain(rule);
  });

  it('accepts plain code', async () => {
    expect(await rulesBroken('export const two = 1 + 1;\n', engineFile)).toEqual([]);
  });

  it('lets the app use the clock but not the inside of the engine', async () => {
    const appFile = 'packages/app/src/probe.ts';
    expect(await rulesBroken('export const t = Date.now();\n', appFile)).toEqual([]);
    expect(await rulesBroken("import '@emptio/engine/src/home-order';\n", appFile)).toContain(
      'no-restricted-imports',
    );
  });
});
