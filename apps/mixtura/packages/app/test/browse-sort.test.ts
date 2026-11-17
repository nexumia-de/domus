/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixtures are known; a missing entry should fail the test */
import { expect, test } from 'vitest';
import type { Drink } from '../src/screens/browse/model';
import { DEFAULT_SORT, parseSort, sortDrinks, sortParams } from '../src/screens/browse/sort';
import { fixtureModel } from './browse-fixture';

const model = fixtureModel();
const names = (drinks: readonly Drink[]): string[] => drinks.map((d) => d.spec.name);
const dated = (drink: Drink, updatedAt?: string, createdAt?: string): Drink => ({
  ...drink,
  spec: {
    ...drink.spec,
    ...(updatedAt && { updatedAt }),
    ...(createdAt && { createdAt }),
  },
});

test('the sort comes from the address; an unknown value is the default', () => {
  expect(parseSort(new URLSearchParams('sort=changed'))).toBe('changed');
  expect(parseSort(new URLSearchParams('sort=template'))).toBe('template');
  expect(parseSort(new URLSearchParams('sort=bogus'))).toBe(DEFAULT_SORT);
  expect(parseSort(new URLSearchParams(''))).toBe('name');
});

test('the default sort has no parameter', () => {
  expect(sortParams('name').toString()).toBe('');
  expect(sortParams('changed').toString()).toBe('sort=changed');
});

test('by name keeps the order the model gives', () => {
  expect(names(sortDrinks(model, model.drinks, 'name'))).toEqual(names(model.drinks));
});

test('by template groups by template name, no template last, ties by name', () => {
  expect(names(sortDrinks(model, model.drinks, 'template'))).toEqual([
    'Daiquiri',
    'Gimlet (less syrup)',
    'Martini',
    'Crème Brûlée Flip',
    'Gin and Soda',
    'No Method Drink',
  ]);
});

test('recently changed puts the newest first, falls back to the creation date, drinks without a date last', () => {
  const [flip, daiquiri, gimlet, soda, martini, plain] = model.drinks as Drink[];
  const list = [
    dated(flip!),
    dated(daiquiri!, '2026-03-01T10:00:00Z'),
    dated(gimlet!, undefined, '2026-05-01T10:00:00Z'),
    dated(soda!, '2026-04-01T10:00:00Z', '2026-01-01T10:00:00Z'),
    dated(martini!, 'not a date'),
    dated(plain!),
  ];
  expect(names(sortDrinks(model, list, 'changed'))).toEqual([
    'Gimlet (less syrup)',
    'Gin and Soda',
    'Daiquiri',
    'Crème Brûlée Flip',
    'Martini',
    'No Method Drink',
  ]);
});

test('sorting does not change the list it was given', () => {
  const before = names(model.drinks);
  sortDrinks(model, model.drinks, 'template');
  expect(names(model.drinks)).toEqual(before);
});
