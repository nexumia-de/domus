import { expect, test } from 'vitest';
import { destinationOf, destinations, rootOf } from '../src/destinations';
import { DEFAULT_HASH, formatHash, normaliseHash, parseHash } from '../src/router';
import { resolve } from '../src/screen';
import { screens } from '../src/screens';

test('a hash becomes path segments and a query', () => {
  const route = parseHash('#/drinks/x%20y?q=a&makeable=1');
  expect(route.path).toEqual(['drinks', 'x y']);
  expect(route.query.get('q')).toBe('a');
  expect(route.query.get('makeable')).toBe('1');
  expect(route.hash).toBe('#/drinks/x%20y?q=a&makeable=1');
});

test('format and parse round-trip', () => {
  const route = parseHash('#/drinks/abc/versions?a=2&b=3');
  expect(formatHash(route.path, route.query)).toBe(route.hash);
});

test('an empty hash opens the home destination', () => {
  for (const hash of ['', '#', '#/']) expect(normaliseHash(hash)).toBe(DEFAULT_HASH);
  expect(normaliseHash('#/stock')).toBe('#/stock');
});

test('a broken escape does not throw', () => {
  expect(parseHash('#/drinks/%E0%A4%A').path).toEqual(['drinks', '%E0%A4%A']);
});

test('the four destinations keep their order and own their routes', () => {
  expect(destinations.map((d) => d.label)).toEqual(['Drinks', 'Templates', 'Stock', 'Settings']);
  expect(destinationOf(parseHash('#/drinks/new'))).toBe('drinks');
  expect(destinationOf(parseHash('#/stock/buy-next'))).toBe('stock');
  expect(destinationOf(parseHash('#/about'))).toBe('settings');
  expect(destinationOf(parseHash('#/nowhere'))).toBeNull();
  expect(rootOf('templates')).toBe('#/templates');
});

test('every URL of the shell resolves to one screen, unknown ones to none', () => {
  const ids = (hash: string) => resolve(parseHash(hash), screens)?.id ?? null;
  expect(ids('#/drinks')).toBe('drinks');
  expect(ids('#/drinks/new')).toBe('editor-new');
  expect(ids('#/drinks/some-id/edit')).toBe('editor-edit');
  expect(ids('#/templates')).toBe('templates');
  expect(ids('#/stock')).toBe('stock');
  expect(ids('#/stock/buy-next')).toBe('buy-next');
  expect(ids('#/settings')).toBe('settings');
  expect(ids('#/about')).toBe('about');
  expect(ids('#/drinks/unknown/deep/path')).toBeNull();
  expect(ids('#/nowhere')).toBeNull();
});

test('screen ids are unique and a pushed screen lies on a destination', () => {
  const found = screens.map((s) => s.id);
  expect(new Set(found).size).toBe(found.length);
  for (const screen of screens) {
    expect(destinations.map((d) => d.id)).toContain(screen.destination);
  }
});
