// The build: bundle and declarations are produced, the bundle is pure, and its
// size is the one recorded in docs/engine.md (within 25 %).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, expect, test } from 'vitest';
import { checkDist } from '../check-dist.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'mixtura-engine-'));
afterAll(() => rmSync(out, { recursive: true, force: true }));

test('the build writes the bundle and the declarations', () => {
  execFileSync(process.execPath, ['build.mjs'], {
    cwd: root,
    env: { ...process.env, MIXTURA_ENGINE_OUT: out },
    stdio: 'pipe',
  });
  expect(existsSync(join(out, 'engine.mjs'))).toBe(true);
  const dts = readFileSync(join(out, 'index.d.ts'), 'utf8');
  expect(dts).toContain("from './model'");
  expect(existsSync(join(out, 'model.d.ts'))).toBe(true);
  expect(existsSync(join(out, 'drink.d.ts'))).toBe(true);
}, 60_000);

test('the bundle has no DOM, host or Node-only reference', () => {
  expect(checkDist(readFileSync(join(out, 'engine.mjs'), 'utf8'))).toEqual([]);
});

test('the check finds what it is meant to find', () => {
  expect(checkDist('const a = window.x;')).not.toEqual([]);
  expect(checkDist('const d = document.body;')).not.toEqual([]);
  expect(checkDist("return { ok: true, document: doc, e: 'not-a-document' };")).toEqual([]);
  expect(checkDist('import fs from "node:fs";')).not.toEqual([]);
  expect(checkDist('const t = Date.now();')).not.toEqual([]);
  expect(checkDist('export const one = () => 1;')).toEqual([]);
});

test('the size matches docs/engine.md', () => {
  const doc = readFileSync(`${root}../../docs/engine.md`, 'utf8');
  const kb = Number(/about (\d+) kB/.exec(doc)?.[1]);
  const size = statSync(join(out, 'engine.mjs')).size / 1000;
  expect(kb).toBeGreaterThan(0);
  expect(size).toBeGreaterThan(kb * 0.75);
  expect(size).toBeLessThan(kb * 1.25);
});
