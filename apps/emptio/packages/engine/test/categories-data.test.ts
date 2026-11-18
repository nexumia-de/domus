import { describe, expect, it } from 'vitest';
import data from '../data/categories.json';

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
