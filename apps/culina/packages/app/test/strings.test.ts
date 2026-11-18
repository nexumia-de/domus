import { expect, test } from 'vitest';
import { strings } from '../src/strings';
import { readSrc } from './css';

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

test('the navigation names its four destinations and the screens use them as titles', () => {
  expect(strings.nav.ratios).toBe(strings.screens.ratios.title);
  expect(strings.nav.components).toBe(strings.screens.components.title);
  expect(strings.nav.dishes).toBe(strings.screens.dishes.title);
  expect(strings.nav.settings).toBe(strings.settings.title);
});

test('the two texts in index.html are the ones in strings', () => {
  const html = readSrc('index.html');
  expect(html).toContain(`<title>${strings.appName}</title>`);
  expect(html).toContain(`<noscript>${strings.noScript}</noscript>`);
});
