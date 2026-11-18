import { expect, test } from 'vitest';
import {
  applyTheme,
  parseTheme,
  readTheme,
  THEME_KEY,
  THEMES,
  writeTheme,
  type KeyValueStore,
} from '../src/prefs';

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

const broken: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
};

test('the default is Follow system; unknown values fall back to it', () => {
  expect(readTheme(memory())).toBe('system');
  expect(parseTheme('sepia')).toBe('system');
  expect(parseTheme(null)).toBe('system');
  expect(THEMES).toEqual(['system', 'light', 'dark']);
});

test('a written theme is read back, under one key', () => {
  const store = memory();
  for (const theme of THEMES) {
    expect(writeTheme(store, theme)).toBe(true);
    expect(readTheme(store)).toBe(theme);
  }
  expect([...store.data.keys()]).toEqual([THEME_KEY]);
});

test('missing or throwing storage never throws and reports that nothing was kept', () => {
  expect(readTheme(null)).toBe('system');
  expect(readTheme(broken)).toBe('system');
  expect(writeTheme(null, 'dark')).toBe(false);
  expect(writeTheme(broken, 'dark')).toBe(false);
});

test('applyTheme sets data-theme for Light and Dark and removes it for Follow system', () => {
  const attrs = new Map<string, string>();
  const root = {
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    removeAttribute: (name: string) => void attrs.delete(name),
  };
  applyTheme(root, 'dark');
  expect(attrs.get('data-theme')).toBe('dark');
  applyTheme(root, 'light');
  expect(attrs.get('data-theme')).toBe('light');
  applyTheme(root, 'system');
  expect(attrs.has('data-theme')).toBe(false);
});
