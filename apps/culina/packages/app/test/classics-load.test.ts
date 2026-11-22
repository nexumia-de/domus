import { afterEach, expect, test } from 'vitest';
import {
  classics,
  fetchPack,
  loadContent,
  readPack,
  readContent,
  resetContent,
  substitutes,
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

test('a file without substitutes has none; one with them keeps them; a bad list is refused', () => {
  expect(readContent(file)?.substitutes).toEqual([]);
  expect(readContent({ ...file, substitutes: [{ id: 's' }] })?.substitutes).toHaveLength(1);
  expect(readContent({ ...file, substitutes: 'x' })).toBeUndefined();
  expect(readContent(file)?.handling).toEqual([]);
  expect(readContent({ ...file, handling: [{ id: 'h' }] })?.handling).toHaveLength(1);
  expect(readContent({ ...file, handling: 'x' })).toBeUndefined();
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
  expect(substitutes()).toEqual([]);
});

const pack = { format: 'culina-classics-pack', formatVersion: 1, classics: [{ id: 'p' }] };

test('a pack file is read, a classics file or anything else is not', () => {
  expect(readPack(pack)).toHaveLength(1);
  expect(readPack({ ...pack, formatVersion: 2 })).toBeUndefined();
  expect(readPack({ ...pack, classics: 'x' })).toBeUndefined();
  expect(readPack(file)).toBeUndefined();
  expect(readPack(null)).toBeUndefined();
});

test('fetching the pack gives its dishes, a failure none, and the shown list is not touched', async () => {
  const asked: string[] = [];
  const got = await fetchPack((url) => {
    asked.push(url);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(pack) });
  });
  expect(asked).toEqual(['classics-pack.json']);
  expect(got).toHaveLength(1);
  expect(classics()).toEqual([]);
  expect(await fetchPack(() => Promise.reject(new Error('offline')))).toEqual([]);
  expect(
    await fetchPack(() => Promise.resolve({ ok: false, json: () => Promise.resolve(pack) })),
  ).toEqual([]);
});
