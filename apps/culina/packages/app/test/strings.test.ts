import { readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { strings } from '../src/strings';
import { readSrc, srcUrl } from './css';

const leaves = (value: unknown, path = 'strings'): [string, string][] =>
  typeof value === 'string'
    ? [[path, value]]
    : typeof value === 'object' && value !== null
      ? Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`))
      : [];

test('every text is present, trimmed and short enough for an experienced cook', () => {
  const all = leaves(strings);
  expect(all.length).toBeGreaterThan(20);
  for (const [path, text] of all) {
    expect(text, path).toBe(text.trim());
    expect(text.length, path).toBeGreaterThan(0);
    expect(text.length, path).toBeLessThanOrEqual(120);
    expect(text, path).not.toMatch(/!|TODO|lorem/i);
  }
});

test('the placeholder screens have the same parts: title, empty state, collapsible guidance', () => {
  for (const screen of Object.values(strings.screens)) {
    expect(Object.keys(screen).sort()).toEqual(['empty', 'guidance', 'guidanceSummary', 'title']);
  }
});

test('the navigation names its five destinations and the screens use them as titles', () => {
  expect(strings.nav.ratios).toBe(strings.screens.ratios.title);
  expect(strings.nav.components).toBe(strings.screens.components.title);
  expect(strings.nav.dishes).toBe(strings.screens.dishes.title);
  expect(strings.nav.stock).toBe(strings.stock.title);
  expect(strings.nav.settings).toBe(strings.settings.title);
});

test('the two texts in index.html are the ones in strings', () => {
  const html = readSrc('index.html');
  expect(html).toContain(`<title>${strings.appName}</title>`);
  expect(html).toContain(`<noscript>${strings.noScript}</noscript>`);
});

// No wording says a recipe or a ratio is wrong (docs/behaviour.md). Comments are left out of the scan.
const FORBIDDEN =
  /\b(wrong|errors?|invalid|incorrect|mistakes?|failed|fail|too much|too little|missing|bad)\b/i;

test('no text says that a recipe or a ratio is wrong, invalid, failed or missing', () => {
  // Every strings file is scanned: the main one and the ones split off by area.
  const files = readdirSync(srcUrl('')).filter((name) => /^strings(-[a-z]+)?\.ts$/.test(name));
  expect(files).toContain('strings-stock.ts');
  for (const file of files) {
    const source = readSrc(file)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(source.length, file).toBeGreaterThan(1000);
    expect(source.match(FORBIDDEN), file).toBeNull();
  }
  expect('That is too much salt'.match(FORBIDDEN)).not.toBeNull();
  expect('an invalid ratio'.match(FORBIDDEN)).not.toBeNull();
});
