import { readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { strings, stringsDe, stringsEn } from '../src/strings';
import { readSrc, srcUrl } from './css';
import { EXAMPLE_FILES, shippedTexts, textsOf } from './content-texts';
import { FORBIDDEN, FORBIDDEN_DE } from './wording';

const leaves = (value: unknown, path = 'strings'): [string, string][] =>
  typeof value === 'string'
    ? [[path, value]]
    : typeof value === 'object' && value !== null
      ? Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`))
      : [];

test.each([
  ['English', stringsEn],
  ['German', stringsDe],
])('every %s text is present, trimmed and short enough for an experienced cook', (_, set) => {
  const all = leaves(set);
  expect(all.length).toBeGreaterThan(20);
  for (const [path, text] of all) {
    expect(text, path).toBe(text.trim());
    expect(text.length, path).toBeGreaterThan(0);
    expect(text.length, path).toBeLessThanOrEqual(set === stringsDe ? 130 : 120);
    expect(text, path).not.toMatch(/!|TODO|lorem/i);
  }
});

test('the tests run with the English set: a device without a setting follows English', () => {
  expect(strings).toBe(stringsEn);
});

test.each([
  ['English', stringsEn],
  ['German', stringsDe],
])('the %s placeholder screens have the same parts: title, empty state, guidance', (_, set) => {
  for (const screen of Object.values(set.screens)) {
    expect(Object.keys(screen).sort()).toEqual(['empty', 'guidance', 'guidanceSummary', 'title']);
  }
});

test.each([
  ['English', stringsEn],
  ['German', stringsDe],
])('the %s navigation names its entries and the screens use them as titles', (_, set) => {
  expect(set.nav.ratios).toBe(set.screens.ratios.title);
  expect(set.nav.components).toBe(set.screens.components.title);
  expect(set.nav.dishes).toBe(set.screens.dishes.title);
  // The Stock entry became Cook; the stock list is a view of Cook, titled by its tab.
  expect(set.nav.cook).toBe(set.cook.title);
  expect(set.stock.title).toBe(set.cook.tabStock);
  expect(set.nav.settings).toBe(set.settings.title);
  // The drawn labels are the same words, only with soft hyphens where they may wrap.
  for (const [entry, drawn] of Object.entries(set.navWrap)) {
    expect(drawn.replaceAll('\u00AD', '')).toBe(set.nav[entry as keyof typeof set.navWrap]);
  }
});

test('the two texts in index.html are the ones in strings', () => {
  const html = readSrc('index.html');
  expect(html).toContain(`<title>${strings.appName}</title>`);
  expect(html).toContain(`<noscript>${strings.noScript}</noscript>`);
});

// No wording says a recipe or a ratio is wrong (docs/behaviour.md). Comments are left out of the scan.
test('no text says that a recipe or a ratio is wrong, invalid, failed or missing', () => {
  // Every strings file is scanned: the English ones, and the German ones in de/.
  const english = readdirSync(srcUrl('')).filter((name) => /^strings-[a-z]+\.ts$/.test(name));
  const german = readdirSync(srcUrl('de')).map((name) => `de/${name}`);
  for (const area of ['app', 'stock', 'cook', 'classics', 'nutrition']) {
    expect(english).toContain(`strings-${area}.ts`);
    expect(german).toContain(`de/strings-${area}.ts`);
  }
  const strip = (file: string): string =>
    readSrc(file)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  for (const file of english) {
    const source = strip(file);
    expect(source.length, file).toBeGreaterThan(1000);
    expect(source.match(FORBIDDEN), file).toBeNull();
  }
  for (const file of german) {
    const source = strip(file);
    expect(source.length, file).toBeGreaterThan(1000);
    expect(source.match(FORBIDDEN_DE), file).toBeNull();
  }
  expect('That is too much salt'.match(FORBIDDEN)).not.toBeNull();
  expect('an invalid ratio'.match(FORBIDDEN)).not.toBeNull();
});

test('no text of a technique, a handling rule or a classic judges a dish, in English or in German', () => {
  // The shipped texts, and the fictional examples so that the scan is never empty.
  const texts = [...shippedTexts(), ...textsOf(EXAMPLE_FILES)];
  expect(texts.length).toBeGreaterThan(10);
  expect(texts.some((t) => t.where.startsWith('handling/'))).toBe(true);
  for (const { where, en, de } of texts) {
    expect(en.match(FORBIDDEN), `${where} (en)`).toBeNull();
    expect(de.match(FORBIDDEN_DE), `${where} (de)`).toBeNull();
  }
  expect('Das Rezept ist falsch'.match(FORBIDDEN_DE)).not.toBeNull();
  expect('Zu viel Salz'.match(FORBIDDEN_DE)).not.toBeNull();
  expect('Ein Fehler im Teig'.match(FORBIDDEN_DE)).not.toBeNull();
});
