import { expect, test } from 'vitest';
import { rowStep, shortcutFor, type KeyPress } from '../src/screens/drinks/keys';

const press = (key: string, extra: Partial<KeyPress> = {}): KeyPress => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  typing: false,
  modal: false,
  enabled: true,
  ...extra,
});

test('/ focuses search and n starts a new drink', () => {
  expect(shortcutFor(press('/'))).toBe('search');
  expect(shortcutFor(press('n'))).toBe('new');
  expect(shortcutFor(press('x'))).toBeUndefined();
  expect(shortcutFor(press('N'))).toBeUndefined();
});

test('shortcuts are off while typing', () => {
  expect(shortcutFor(press('n', { typing: true }))).toBeUndefined();
  expect(shortcutFor(press('/', { typing: true }))).toBeUndefined();
});

test('shortcuts leave browser shortcuts alone', () => {
  expect(shortcutFor(press('n', { ctrlKey: true }))).toBeUndefined();
  expect(shortcutFor(press('n', { metaKey: true }))).toBeUndefined();
  expect(shortcutFor(press('n', { altKey: true }))).toBeUndefined();
});

test('shortcuts are off over a dialog, after another handler took the key, and when switched off', () => {
  expect(shortcutFor(press('n', { modal: true }))).toBeUndefined();
  expect(shortcutFor(press('n', { defaultPrevented: true }))).toBeUndefined();
  expect(shortcutFor(press('n', { enabled: false }))).toBeUndefined();
});

test('arrow keys step through the rows', () => {
  expect(rowStep('ArrowDown', -1, 5, false)).toEqual({ to: 'row', index: 0 });
  expect(rowStep('ArrowDown', 1, 5, false)).toEqual({ to: 'row', index: 2 });
  expect(rowStep('ArrowUp', 3, 5, false)).toEqual({ to: 'row', index: 2 });
});

test('down from the last row reaches the show-more button, or stays', () => {
  expect(rowStep('ArrowDown', 4, 5, true)).toEqual({ to: 'more' });
  expect(rowStep('ArrowDown', 4, 5, false)).toBeUndefined();
});

test('up from the first row reaches the search field, which has nothing above it', () => {
  expect(rowStep('ArrowUp', 0, 5, false)).toEqual({ to: 'search' });
  expect(rowStep('ArrowUp', -1, 5, false)).toBeUndefined();
});

test('Home and End jump between the ends of the rows, not in the search field', () => {
  expect(rowStep('Home', 3, 5, false)).toEqual({ to: 'row', index: 0 });
  expect(rowStep('End', 1, 5, true)).toEqual({ to: 'row', index: 4 });
  expect(rowStep('Home', -1, 5, false)).toBeUndefined();
  expect(rowStep('End', -1, 5, false)).toBeUndefined();
});

test('no rows, no step; other keys do nothing', () => {
  expect(rowStep('ArrowDown', -1, 0, false)).toBeUndefined();
  expect(rowStep('PageDown', 1, 5, false)).toBeUndefined();
});
