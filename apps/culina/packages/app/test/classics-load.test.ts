import { afterEach, expect, test } from 'vitest';
import {
  classics,
  loadContent,
  readContent,
  resetContent,
  techniques,
} from '../src/classics/content';

afterEach(resetContent);

const file = {
  format: 'culina-classics',
  formatVersion: 1,
  classics: [{ id: 'a' }],
  techniques: [],
};

test('a classics file is read, anything else is not', () => {
  expect(readContent(file)?.classics).toHaveLength(1);
  expect(readContent({ ...file, formatVersion: 2 })).toBeUndefined();
  expect(readContent({ ...file, classics: 'x' })).toBeUndefined();
  expect(readContent(null)).toBeUndefined();
});

test('loading fills the lists; a failed load leaves the app with zero dishes', async () => {
  expect(classics()).toEqual([]);
  await loadContent(() => Promise.reject(new Error('offline')));
  expect(classics()).toEqual([]);
  await loadContent(() => Promise.resolve({ ok: false, json: () => Promise.resolve(file) }));
  expect(classics()).toEqual([]);
  await loadContent(() => Promise.resolve({ ok: true, json: () => Promise.resolve(file) }));
  expect(classics()).toHaveLength(1);
  expect(techniques()).toEqual([]);
});
