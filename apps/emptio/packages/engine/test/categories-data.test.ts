import { describe, expect, it } from 'vitest';
import data from '../data/categories.json';
import items from '../data/usual-items.json';
import { sortKey, usualCategory } from '../src/index';

describe('starting categories', () => {
  const ids = data.categories.map((category) => category.id);

  it('have unique ids and end with other', () => {
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.at(-1)).toBe('other');
  });

  it('carry an English and a German name each', () => {
    for (const category of data.categories) {
      expect(category.en).not.toBe('');
      expect(category.de).not.toBe('');
    }
  });

  it('name their source', () => {
    expect(data.source).toContain('AGPL-3.0-or-later');
  });
});

describe('usual items', () => {
  const ids = new Set(data.categories.map((category) => category.id));

  it('belong to starting categories, never to other', () => {
    for (const id of Object.keys(items.items)) {
      expect(ids.has(id), id).toBe(true);
      expect(id).not.toBe('other');
    }
  });

  it('are each found under the category that lists them, unless an earlier category lists the same name', () => {
    const seen = new Map<string, string>();
    for (const [id, names] of Object.entries(items.items)) {
      for (const name of [...names.de, ...names.en]) {
        const key = sortKey(name);
        if (!seen.has(key)) seen.set(key, id);
        expect(usualCategory(name), name).toBe(seen.get(key));
      }
    }
  });

  it('name no thing under two categories', () => {
    const seen = new Map<string, string>();
    for (const [id, names] of Object.entries(items.items)) {
      for (const name of [...names.de, ...names.en]) {
        const key = sortKey(name);
        expect(seen.get(key) ?? id, name).toBe(id);
        seen.set(key, id);
      }
    }
  });

  it('name their source', () => {
    expect(items.source).toContain('AGPL-3.0-or-later');
  });
});
