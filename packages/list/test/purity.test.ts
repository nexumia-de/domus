// Keeps the purity rule of AGENTS.md in force: asks ESLint, with this package's own
// configuration, to judge source that reaches for the clock, chance, the host or the host package.
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));
const eslint = new ESLint({ cwd: root });

async function rulesBroken(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `${root}src/probe.ts` });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'parse');
}

describe('the list package is pure', () => {
  it.each([
    ['the clock', 'export const t = Date.now();', 'no-restricted-globals'],
    ['chance', 'export const r = Math.random();', 'no-restricted-syntax'],
    ['the network', "export const p = fetch('/x');", 'no-restricted-globals'],
    ['storage', 'export const s = localStorage.length;', 'no-restricted-globals'],
    ['IndexedDB', 'export const d = indexedDB;', 'no-restricted-globals'],
    ['logging', "console.log('x');", 'no-console'],
    ['the host package', "import '@nexumia-de/hospes';", 'no-restricted-imports'],
  ])('rejects %s', async (_what, code, rule) => {
    expect(await rulesBroken(code)).toContain(rule);
  });

  it('accepts plain code', async () => {
    expect(await rulesBroken('export const two = 1 + 1;\n')).toEqual([]);
  });
});
