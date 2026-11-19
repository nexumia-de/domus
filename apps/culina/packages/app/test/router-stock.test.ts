import { expect, test } from 'vitest';
import { actionFromHash, hashFor, paramFromHash, routeFromHash } from '../src/router';

test('the stock routes: the list, the quick entry and the item', () => {
  expect(hashFor('stock')).toBe('#/stock');
  expect(hashFor('stock', undefined, 'add')).toBe('#/stock/add');
  expect(hashFor('stock', 'u-1', 'edit')).toBe('#/stock/u-1/edit');
  expect(routeFromHash('#/stock/add')).toBe('stock');
  expect(actionFromHash('#/stock/add')).toBe('add');
  expect(paramFromHash('#/stock/add')).toBeUndefined();
  expect(actionFromHash('#/stock/u-1/edit')).toBe('edit');
  expect(paramFromHash('#/stock/u-1/edit')).toBe('u-1');
});

test('an item has no history and add is not an item id', () => {
  expect(actionFromHash('#/stock/u-1/history')).toBeUndefined();
  expect(actionFromHash('#/stock/add/edit')).toBeUndefined();
  expect(actionFromHash('#/stock')).toBeUndefined();
});
