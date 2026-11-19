import { expect, test } from 'vitest';
import {
  actionFromHash,
  hashFor,
  NAV_ENTRIES,
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

test('the navigation has Start and five entries; the stock screens are shown under Cook', () => {
  expect(NAV_ENTRIES).toEqual(['start', 'ratios', 'components', 'dishes', 'cook', 'settings']);
  for (const route of ROUTES) expect(NAV_ENTRIES).toContain(navEntryFor(route));
  expect(navEntryFor('stock')).toBe('cook');
  expect(navEntryFor('cook')).toBe('cook');
  expect(navEntryFor('dishes')).toBe('dishes');
});
