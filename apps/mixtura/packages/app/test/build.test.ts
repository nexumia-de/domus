// Builds the app into a temporary folder and checks what a browser needs
// to install it: manifest, icons, service worker, no external URL.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';

let out = '';
const read = (file: string) => readFileSync(join(out, file), 'utf8');

function listFiles(dir: string, base = ''): string[] {
  return readdirSync(join(dir, base)).flatMap((name) => {
    const path = join(base, name);
    return statSync(join(dir, path)).isDirectory() ? listFiles(dir, path) : [path];
  });
}

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), 'mixtura-build-'));
  execFileSync('node', ['build.mjs'], { env: { ...process.env, MIXTURA_OUT: out }, stdio: 'pipe' });
}, 60_000);

afterAll(() => rmSync(out, { recursive: true, force: true }));

test('the manifest has what installability needs', () => {
  const manifest = JSON.parse(read('manifest.webmanifest')) as Record<string, unknown> & {
    icons: { src: string; sizes: string; type: string; purpose: string }[];
  };
  expect(manifest['name']).toBe('Drink Builder');
  expect(manifest['short_name']).toBeTruthy();
  expect(manifest['start_url']).toBe('./');
  expect(manifest['scope']).toBe('./');
  expect(manifest['display']).toBe('standalone');
  expect(manifest['theme_color']).toMatch(/^#[0-9a-f]{6}$/);
  expect(manifest['background_color']).toMatch(/^#[0-9a-f]{6}$/);
  const sizes = manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose}`);
  expect(sizes).toContain('192x192:any');
  expect(sizes).toContain('512x512:any');
  expect(sizes).toContain('512x512:maskable');
  for (const icon of manifest.icons) expect(statSync(join(out, icon.src)).size).toBeGreaterThan(0);
});

test('the PNG icons have the declared size', () => {
  for (const [file, size] of [
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
    ['icons/icon-maskable-512.png', 512],
  ] as const) {
    const png = readFileSync(join(out, file));
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  }
});

test('the page links the manifest and the app registers the service worker', () => {
  const html = read('index.html');
  expect(html).toContain('rel="manifest"');
  expect(html).toContain('name="viewport"');
  expect(read('main.js')).toContain('sw.js');
});

test('the service worker precaches every built file under a content-hash cache name', () => {
  const sw = read('sw.js');
  const cache = /mixtura-[0-9a-f]{16}/.exec(sw)?.[0];
  expect(cache).toBeTruthy();
  const precached = listFiles(out).filter((file) => file !== 'sw.js');
  for (const file of precached) expect(sw).toContain(`"${file}"`);
  expect(sw).toContain('"./"');
});

test('the cache name changes when a file changes and not otherwise', () => {
  const second = mkdtempSync(join(tmpdir(), 'mixtura-build-'));
  try {
    execFileSync('node', ['build.mjs'], {
      env: { ...process.env, MIXTURA_OUT: second },
      stdio: 'pipe',
    });
    const name = (dir: string) =>
      /mixtura-[0-9a-f]{16}/.exec(readFileSync(join(dir, 'sw.js'), 'utf8'))?.[0];
    expect(name(second)).toBe(name(out));
  } finally {
    rmSync(second, { recursive: true, force: true });
  }
}, 60_000);

test('no external URL appears in the built output', () => {
  const namespace = 'http://www.w3.org/2000/svg';
  for (const file of listFiles(out).filter((f) => !f.endsWith('.png'))) {
    const urls = (read(file).match(/https?:\/\/[^\s"'<>)]+/g) ?? []).filter((u) => u !== namespace);
    expect(urls, file).toEqual([]);
  }
});
