// The bundle the people get: the GitHub API address is fixed, nothing else is reachable, and
// there is no manifest and no service worker (docs/deployment.md).
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { GITHUB_API, buildApp } from '../build.mjs';

let work: string;
let production: string;
let testBuild: string;
beforeAll(async () => {
  work = mkdtempSync(join(tmpdir(), 'domus-build-'));
  production = await buildApp({ outdir: join(work, 'production') });
  testBuild = await buildApp({ outdir: join(work, 'test'), githubApi: 'http://127.0.0.1:4010' });
}, 60_000);
afterAll(() => rmSync(work, { recursive: true, force: true }));

const read = (dir: string, file: string): string => readFileSync(join(dir, file), 'utf8');
const hosts = (text: string): string[] =>
  [
    ...new Set(
      [...text.matchAll(/https?:\/\/[A-Za-z0-9][A-Za-z0-9.-]*(?::\d+)?/g)].map((m) => m[0]),
    ),
  ].sort();

test('the production bundle names no host but GitHub, the QR encoder’s XML namespace and nothing local', () => {
  const found = hosts(read(production, 'main.js'));
  expect(found).toContain(GITHUB_API);
  expect(
    found.filter(
      (host) =>
        !['https://api.github.com', 'https://github.com', 'http://www.w3.org'].includes(host),
    ),
  ).toEqual([]);
  expect(read(production, 'main.js')).not.toMatch(/127\.0\.0\.1|localhost|__GITHUB_API__/);
  expect(read(production, 'main.js')).not.toContain('DOMUS_GITHUB_API');
});

test('localStorage is touched by prefs.ts only: language and theme, nothing else', () => {
  const dir = join(import.meta.dirname, '..', 'src');
  const users = readdirSync(dir, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.ts'))
    .filter((file) => /localStorage|sessionStorage/.test(readFileSync(join(dir, file), 'utf8')));
  expect(users).toEqual(['prefs.ts']);
});

test('the address cannot be changed at run time: no URL parameter or setting is read for it', () => {
  const source = readdirSync(join(import.meta.dirname, '..', 'src'), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => readFileSync(join(import.meta.dirname, '..', 'src', file), 'utf8'))
    .join('\n');
  expect(source).not.toMatch(/URLSearchParams|location\.search|location\.href/);
  // Wherever a call is given an API base, it is the constant of the build.
  const given = [...source.matchAll(/apiBase\s*:\s*([^,}\s]+)/g)].map((m) => m[1]);
  expect(given.length).toBeGreaterThan(0);
  expect(new Set(given)).toEqual(new Set(['GITHUB_API']));
});

test('the test build compiles another address in and lets the page connect to that origin only', () => {
  expect(read(testBuild, 'main.js')).toContain('http://127.0.0.1:4010');
  const policy = /content="([^"]*)"/.exec(read(testBuild, 'index.html'))?.[1] ?? '';
  expect(policy).toContain(
    "connect-src 'self' http://127.0.0.1:4010 https://api.github.com https:",
  );
  expect(read(production, 'index.html')).not.toContain('127.0.0.1');
});

test('the policy: nothing but the page itself, GitHub and the household’s own https storage', () => {
  const html = read(production, 'index.html');
  const policy = /http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(html)?.[1];
  expect(policy).toBe(
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' https://api.github.com https:; base-uri 'none'; form-action 'none'",
  );
  expect(policy).not.toMatch(/unsafe-|data:|http:/);
  // No inline script or style: the policy would block them.
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>\s*\S/);
  expect(html).not.toMatch(/<style|style=/);
});

test('no manifest and no service worker', () => {
  const files = readdirSync(production).sort();
  expect(files).toEqual(['app.css', 'icon.svg', 'index.html', 'main.js', 'theme-init.js']);
  expect(existsSync(join(production, 'manifest.webmanifest'))).toBe(false);
  expect(existsSync(join(production, 'sw.js'))).toBe(false);
  expect(read(production, 'index.html')).not.toMatch(/rel="manifest"|apple-touch-icon/);
  expect(read(production, 'main.js')).not.toContain('serviceWorker');
  expect(read(production, 'theme-init.js')).not.toContain('serviceWorker');
});

test('every URL in the page is relative', () => {
  const html = read(production, 'index.html');
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    expect(url, url).not.toMatch(/^(?:[a-z]+:)?\/\//);
    expect(url, url).not.toMatch(/^\//);
  }
});
