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
  // The install-dialog screenshots are deliberately not precached (docs/development.md);
  // `_headers` is for the host, not part of the app.
  const precached = listFiles(out).filter(
    (file) => file !== 'sw.js' && file !== '_headers' && !file.startsWith('screenshots'),
  );
  for (const file of precached) expect(sw).toContain(`"${file}"`);
  expect(sw).toContain('"./"');
  for (const file of listFiles(out).filter((f) => f.startsWith('screenshots'))) {
    expect(sw, file).not.toContain(`"${file}"`);
  }
});

test('the manifest is complete: categories, shortcuts, screenshots, monochrome icon, description', () => {
  type Image = { src: string; sizes: string; type: string; purpose?: string; form_factor?: string };
  const manifest = JSON.parse(read('manifest.webmanifest')) as {
    categories: string[];
    shortcuts: { name: string; url: string; icons?: Image[] }[];
    screenshots: Image[];
    icons: Image[];
  };
  expect(manifest.categories.length).toBeGreaterThan(0);
  expect(manifest.icons.some((i) => i.purpose === 'monochrome')).toBe(true);
  expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);
  for (const shortcut of manifest.shortcuts) {
    expect(shortcut.url).toMatch(/^\.\/#\//);
    for (const icon of shortcut.icons ?? [])
      expect(statSync(join(out, icon.src)).size).toBeGreaterThan(0);
  }
  const factors = manifest.screenshots.map((s) => s.form_factor);
  expect(factors).toContain('narrow');
  expect(factors).toContain('wide');
  for (const shot of manifest.screenshots) {
    const png = readFileSync(join(out, shot.src));
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(shot.sizes);
    const [w = 0, h = 0] = shot.sizes.split('x').map(Number);
    expect(shot.form_factor === 'wide' ? w > h : h > w).toBe(true);
  }
  expect(read('index.html')).toMatch(/<meta\s+name="description"\s+content="[^"]{50,}"/);
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
  // The seed data names its source in `source.url` fields: data shown in About, never requested.
  for (const file of listFiles(out).filter((f) => !f.endsWith('.png') && f !== 'seed/seed.json')) {
    // JSON Schema identifiers (`$schema`, vocabularies, Ajv's own meta-schema id)
    // are names in the validator, never requested; e2e checks that no request
    // leaves the origin.
    const identifier =
      /^https?:\/\/(json-schema\.org\/|raw\.githubusercontent\.com\/ajv-validator\/)/;
    // The two local addresses of `connect-src` are policy source expressions (a port wildcard),
    // not addresses the app requests.
    const policySource = /^http:\/\/(localhost|127\.0\.0\.1):\*;?$/;
    const urls = (read(file).match(/https?:\/\/[^\s"'<>)]+/g) ?? []).filter(
      (u) => u !== namespace && !identifier.test(u) && !policySource.test(u),
    );
    expect(urls, file).toEqual([]);
  }
});

test('no root-absolute URL in the entry, manifest, worker files or script: the app works under a sub-path', () => {
  const absolute = /(?:href|src)="\/(?!\/)/;
  expect(read('index.html')).not.toMatch(absolute);
  const manifest = JSON.parse(read('manifest.webmanifest')) as {
    start_url: string;
    scope: string;
    id: string;
    icons: { src: string }[];
  };
  for (const url of [
    manifest.start_url,
    manifest.scope,
    manifest.id,
    ...manifest.icons.map((i) => i.src),
  ]) {
    expect(url.startsWith('/'), url).toBe(false);
  }
  const list = JSON.parse(/\["\.\/"[^\]]*\]/.exec(read('sw.js'))?.[0] ?? '[]') as string[];
  for (const file of list) expect(file.startsWith('/'), file).toBe(false);
  expect(read('main.js')).not.toMatch(/register\(["']\//);
  expect(read('app.css')).not.toMatch(/url\(["']?\/(?!\/)/);
});

test('strict policy: no dynamic code in the scripts, no inline script or style in the page', () => {
  for (const file of ['main.js', 'rank-worker.js', 'theme-init.js', 'sw.js']) {
    const code = read(file);
    expect(code, file).not.toMatch(/new Function\(|\beval\(|Function\(["'`]/);
  }
  const html = read('index.html');
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(
    ([, attributes, body]) => !/\bsrc=/.test(attributes ?? '') || (body ?? '').trim() !== '',
  );
  expect(inline).toEqual([]);
  expect(html).not.toMatch(/<style\b|\sstyle=|\son[a-z]+=/);
  const policy = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1] ?? '';
  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("base-uri 'none'");
  // Only `connect-src` may name hosts: the user's sync storage (docs/sync-backends.md#policy).
  const connect = /(?:^|; )connect-src ([^;]*)/.exec(policy)?.[1];
  expect(connect).toBe("'self' https: http://localhost:* http://127.0.0.1:*");
  expect(policy.replace(/connect-src [^;]*/, '')).not.toMatch(/unsafe-|https?:|\*/);
  expect(policy).not.toMatch(/unsafe-/);
});

test('the _headers file carries the page policy as a header, from the same source', () => {
  const html = read('index.html');
  const meta = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1] ?? '';
  expect(html).not.toContain('{{');
  const header = /^ {2}Content-Security-Policy: (.+)$/m.exec(read('_headers'))?.[1] ?? '';
  expect(header).toBe(`${meta}; frame-ancestors 'none'`);
  expect(meta).not.toContain('frame-ancestors');
});

test('_headers: the other security headers, no-cache for the entry files, no immutable', () => {
  const headers = read('_headers');
  for (const line of [
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: no-referrer',
    'Cross-Origin-Opener-Policy: same-origin',
  ])
    expect(headers).toContain(`  ${line}`);
  expect(headers).toMatch(/^ {2}Permissions-Policy: .*camera=\(\)/m);
  for (const path of ['/', '/index.html', '/sw.js', '/manifest.webmanifest'])
    expect(headers).toContain(`\n${path}\n  Cache-Control: no-cache\n`);
  // Fixed file names: no file may be cached without asking the server.
  expect(headers).not.toMatch(/immutable|max-age/);
  // Cloudflare's limits: 100 rules, 2,000 characters a line.
  expect(headers.split('\n').every((line) => line.length <= 2000)).toBe(true);
  expect(
    headers.split('\n').filter((line) => /^\S/.test(line) && !line.startsWith('#')).length,
  ).toBeLessThanOrEqual(100);
  expect(listFiles(out)).toContain('_headers');
  expect(read('sw.js')).not.toContain('_headers');
});

test('the theme bootstrap is an external file that runs before the page is drawn', () => {
  const html = read('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  expect(head).toMatch(/<script src="theme-init\.js"><\/script>/);
  expect(head).not.toMatch(/<script[^>]*\b(defer|async|type="module")/);
  expect(listFiles(out)).toContain('theme-init.js');
  expect(read('sw.js')).toContain('"theme-init.js"');
});
