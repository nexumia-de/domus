import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeAll, expect, test } from 'vitest';
import { must } from './must';

const app = new URL('..', import.meta.url);
const dist = new URL('dist/', app);

const builtFiles = (): string[] =>
  readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      `${entry.parentPath}/${entry.name}`.slice(dist.pathname.length - 1).replace(/^\/+/, ''),
    )
    .sort();

beforeAll(() => {
  execFileSync('node', ['build.mjs'], { cwd: app, stdio: 'pipe' });
}, 60_000);

/** Runs the built sw.js against fake caches and returns its handlers and what it did. */
const runWorker = (existing: string[]) => {
  const listeners = new Map<string, (event: unknown) => void>();
  const opened: string[] = [];
  const added: string[][] = [];
  const deleted: string[] = [];
  const cached = new Map<string, string>([
    ['main.js', 'JS'],
    ['index.html', 'SHELL'],
  ]);
  const caches = {
    open: async (name: string) => {
      opened.push(name);
      return {
        addAll: async (files: string[]) => void added.push(files),
        match: async (request: string | { url: string }) =>
          cached.get(
            typeof request === 'string' ? request : new URL(request.url).pathname.slice(1),
          ),
      };
    },
    keys: async () => existing,
    delete: async (name: string) => void deleted.push(name),
  };
  let claimed = false;
  let skipped = false;
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => void listeners.set(type, fn),
    skipWaiting: async () => void (skipped = true),
    clients: { claim: async () => void (claimed = true) },
    location: { origin: 'http://x' },
  };
  runInNewContext(readFileSync(new URL('sw.js', dist), 'utf8'), {
    self,
    caches,
    URL,
    fetch: async () => 'NETWORK',
  });
  const waitUntil = async (type: string) => {
    let pending: Promise<unknown> = Promise.resolve();
    must(listeners.get(type))({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
  };
  return { waitUntil, opened, added, deleted, state: () => ({ claimed, skipped }), listeners };
};

test('the build writes the page, one script, one stylesheet, the manifest, icons and sw.js', () => {
  const files = builtFiles();
  for (const file of [
    'index.html',
    'main.js',
    'theme-init.js',
    'app.css',
    'manifest.webmanifest',
    'catalogue.json',
    'sw.js',
  ]) {
    expect(files, file).toContain(file);
  }
  expect(files.filter((f) => f.startsWith('icons/')).length).toBeGreaterThanOrEqual(4);
});

test('the catalogue is its own file, precached, and main.js does not carry it', () => {
  const catalogue = readFileSync(new URL('catalogue.json', dist), 'utf8');
  expect(JSON.parse(catalogue).format).toBe('culina-ingredient-catalogue');
  const main = readFileSync(new URL('main.js', dist), 'utf8');
  expect(main).not.toContain('fdc-169230');
  expect(main).toContain('catalogue.json');
});

test('built URLs are relative', () => {
  const html = readFileSync(new URL('index.html', dist), 'utf8');
  expect(html).not.toMatch(/(href|src)="(\/|https?:)/);
  expect(readFileSync(new URL('app.css', dist), 'utf8')).not.toMatch(/url\(\s*["']?\//);
});

test('the precache list equals the built files except sw.js', async () => {
  const worker = runWorker([]);
  await worker.waitUntil('install');
  const expected = builtFiles().filter((file) => file !== 'sw.js');
  expect(worker.added).toHaveLength(1);
  expect([...must(worker.added[0])].sort()).toEqual(expected);
  expect(worker.opened[0]).toMatch(/^culina-[0-9a-f]{16}$/);
  expect(worker.state().skipped).toBe(true);
});

test('the cache version is the same for the same content', () => {
  const version = () =>
    /culina-[0-9a-f]{16}/.exec(readFileSync(new URL('dist/sw.js', app), 'utf8'))?.[0];
  const first = version();
  execFileSync('node', ['build.mjs'], { cwd: app, stdio: 'pipe' });
  expect(version()).toBe(first);
});

test('activate deletes caches of other versions and keeps the current one and foreign names', async () => {
  const probe = runWorker([]);
  await probe.waitUntil('install');
  const current = must(probe.opened[0]);
  const worker = runWorker([
    'culina-0000000000000000',
    current,
    'culina-ffffffffffffffff',
    'other-app',
  ]);
  await worker.waitUntil('activate');
  expect(worker.deleted.sort()).toEqual(['culina-0000000000000000', 'culina-ffffffffffffffff']);
  expect(worker.state().claimed).toBe(true);
});

test('the worker answers own-origin GET requests from the cache and falls back to the shell', async () => {
  const worker = runWorker([]);
  const fetchHandler = must(worker.listeners.get('fetch'));
  const ask = async (method: string, url: string, mode = 'cors'): Promise<unknown> => {
    let answer: unknown = 'not handled';
    fetchHandler({
      request: { method, url, mode },
      respondWith: (p: Promise<unknown>) => (answer = p),
    });
    return answer;
  };
  expect(await ask('POST', 'http://x/main.js')).toBe('not handled');
  expect(await ask('GET', 'http://other/main.js')).toBe('not handled');
  expect(await ask('GET', 'http://x/main.js')).toBe('JS');
  expect(await ask('GET', 'http://x/deep/link', 'navigate')).toBe('SHELL');
  expect(await ask('GET', 'http://x/unknown.png')).toBe('NETWORK');
});
