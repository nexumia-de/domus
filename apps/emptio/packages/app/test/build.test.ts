// The built app: the files it has, a service worker that knows them, a page
// policy that loads nothing foreign, and a GitHub address that is compiled in.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GITHUB_API, buildApp } from '../build.mjs';

const folder = mkdtempSync(join(tmpdir(), 'emptio-build-'));
let built: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  built = await buildApp({ outdir: join(folder, 'dist') });
}, 60_000);
afterAll(() => rmSync(folder, { recursive: true, force: true }));

const read = (name: string): string => readFileSync(join(built.outdir, name), 'utf8');

describe('the build', () => {
  it('has the page, the scripts, the manifest and every icon the manifest names', () => {
    for (const name of ['index.html', 'main.js', 'app.css', 'theme-init.js', 'sw.js']) {
      expect(existsSync(join(built.outdir, name)), name).toBe(true);
    }
    const manifest = JSON.parse(read('manifest.webmanifest')) as {
      start_url: string;
      scope: string;
      icons: { src: string }[];
    };
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    for (const icon of manifest.icons) {
      expect(existsSync(join(built.outdir, icon.src)), icon.src).toBe(true);
    }
  });

  it('gives the service worker every built file but itself, under the cache prefix emptio-', () => {
    const sw = read('sw.js');
    for (const file of built.files.filter((name) => name !== 'sw.js')) {
      expect(sw, file).toContain(`"${file}"`);
    }
    expect(sw).toContain('emptio-');
    expect(sw).toContain(built.version);
    // The worker bundle does not carry the sync code.
    expect(sw).not.toContain('api.github.com');
  });

  it('references only relative files, so the app works from a folder of the address', () => {
    const html = read('index.html');
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1] ?? '');
    expect(refs.length).toBeGreaterThan(4);
    for (const ref of refs) {
      expect(ref.startsWith('/') || ref.includes('://'), ref).toBe(false);
      expect(existsSync(join(built.outdir, ref)), ref).toBe(true);
    }
  });

  it('has a page policy without inline code and without plain http', () => {
    const csp = /Content-Security-Policy"\s+content="([^"]+)"/.exec(read('index.html'))?.[1] ?? '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe');
    expect(csp).not.toContain('http:');
    expect(csp).toContain(`connect-src 'self' ${GITHUB_API} https:`);
  });

  it('compiles the GitHub address in, and a test build can name another', async () => {
    expect(read('main.js')).toContain(GITHUB_API);
    const test = await buildApp({
      outdir: join(folder, 'test-build'),
      githubApi: 'http://127.0.0.1:9',
    });
    const main = readFileSync(join(test.outdir, 'main.js'), 'utf8');
    expect(main).toContain('http://127.0.0.1:9');
    expect(readFileSync(join(test.outdir, 'index.html'), 'utf8')).toContain(
      "connect-src 'self' http://127.0.0.1:9 https://api.github.com",
    );
  }, 60_000);
});
