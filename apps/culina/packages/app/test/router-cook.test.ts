import { expect, test } from 'vitest';
import {
  actionFromHash,
  hashFor,
  NAV_ENTRIES,
  NAV_ROUTE,
  navEntryFor,
  paramFromHash,
  routeFromHash,
  ROUTES,
  USE_UP,
} from '../src/router';

test('the cook routes: the finder, use up first and one ingredient', () => {
  expect(hashFor('cook')).toBe('#/cook');
  expect(hashFor('cook', USE_UP)).toBe('#/cook/use-up');
  expect(hashFor('cook', 'leek', 'with')).toBe('#/cook/leek/with');
  expect(routeFromHash('#/cook/leek/with')).toBe('cook');
  expect(paramFromHash('#/cook/leek/with')).toBe('leek');
  expect(actionFromHash('#/cook/leek/with')).toBe('with');
  expect(paramFromHash('#/cook/use-up')).toBe(USE_UP);
  expect(actionFromHash('#/cook/use-up')).toBeUndefined();
  expect(actionFromHash('#/cook')).toBeUndefined();
  expect(actionFromHash('#/cook/use-up/with')).toBeUndefined();
});

test('an ingredient id with a space or slash survives the round trip', () => {
  const hash = hashFor('cook', 'a b/c', 'with');
  expect(paramFromHash(hash)).toBe('a b/c');
  expect(actionFromHash(hash)).toBe('with');
});

test('the navigation has four destinations; every route is shown under one, Settings under none', () => {
  expect(NAV_ENTRIES).toEqual(['start', 'cook', 'notebook', 'ratios']);
  for (const route of ROUTES) {
    const entry = navEntryFor(route);
    if (route === 'settings') expect(entry).toBeUndefined();
    else expect(NAV_ENTRIES).toContain(entry);
  }
  // Cook holds the finder and the stock; the Notebook the components and every dish, own or
  // shipped (with its cooking mode), and the old address of the classics.
  for (const route of ['cook', 'stock'] as const) expect(navEntryFor(route)).toBe('cook');
  for (const route of ['components', 'dishes', 'classics', 'classic'] as const)
    expect(navEntryFor(route)).toBe('notebook');
  expect(navEntryFor('start')).toBe('start');
  expect(navEntryFor('ratios')).toBe('ratios');
});

test('every entry opens a route, and the old routes still parse', () => {
  expect(Object.keys(NAV_ROUTE).sort()).toEqual([...NAV_ENTRIES].sort());
  expect(hashFor(NAV_ROUTE.notebook)).toBe('#/components');
  for (const hash of ['#/components', '#/dishes', '#/classics', '#/cook', '#/stock', '#/settings'])
    expect(hashFor(routeFromHash(hash))).toBe(hash);
});
