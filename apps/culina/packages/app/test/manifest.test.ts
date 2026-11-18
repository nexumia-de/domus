import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { readSrc, readThemes, srcUrl } from './css';

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}
const manifest = JSON.parse(readSrc('manifest.webmanifest')) as Record<string, unknown> & {
  icons: Icon[];
};

test('the manifest has the installability fields', () => {
  for (const key of [
    'name',
    'short_name',
    'start_url',
    'scope',
    'theme_color',
    'background_color',
  ]) {
    expect(manifest[key], key).toBeTruthy();
  }
  expect(manifest.name).toBe("Cook's Notebook");
  expect(manifest.display).toBe('standalone');
});

test('URLs are relative, so the app works from a sub-path', () => {
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  for (const icon of manifest.icons) expect(icon.src).toMatch(/^icons\//);
});

test('there are icons of 192 and 512 px and a maskable one, and the files exist', () => {
  const has = (sizes: string, purpose: string) =>
    manifest.icons.some((i) => i.sizes === sizes && (i.purpose ?? 'any') === purpose);
  expect(has('192x192', 'any')).toBe(true);
  expect(has('512x512', 'any')).toBe(true);
  expect(has('512x512', 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    expect(existsSync(srcUrl(`assets/${icon.src.replace('icons/', '')}`)), icon.src).toBe(true);
  }
});

test('the PNG icons have the sizes the manifest states', () => {
  for (const icon of manifest.icons.filter((i) => i.type === 'image/png')) {
    const png = readFileSync(srcUrl(`assets/${icon.src.replace('icons/', '')}`));
    const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
    expect(size, icon.src).toBe(icon.sizes);
  }
});

test('theme_color, background_color and the theme-color metas are the --bg tokens', () => {
  const { light, darkChosen } = readThemes();
  expect(manifest.theme_color).toBe(light['--bg']);
  expect(manifest.background_color).toBe(light['--bg']);
  const html = readSrc('index.html');
  expect(html).toContain(`content="${light['--bg']}" media="(prefers-color-scheme: light)"`);
  expect(html).toContain(`content="${darkChosen['--bg']}" media="(prefers-color-scheme: dark)"`);
});

test('index.html: strict CSP, no inline script or style, theme script before the stylesheet, relative URLs', () => {
  const html = readSrc('index.html');
  expect(html).toContain("default-src 'self'");
  expect(html).not.toMatch(/'unsafe-inline'|'unsafe-eval'/);
  expect(html).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
  expect(html).not.toMatch(/<style|\sstyle=|\son[a-z]+=/);
  expect(html.indexOf('theme-init.js')).toBeGreaterThan(-1);
  expect(html.indexOf('theme-init.js')).toBeLessThan(html.indexOf('app.css'));
  expect(html).not.toMatch(/(href|src)="(\/|https?:)/);
});
