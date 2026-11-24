// What counts as an entry among the records of the shared collection `list`. Moved from
// Emptio's app on 2026-11-24 (it had no test of its own; Emptio's actions tests read it).
import { describe, expect, it } from 'vitest';
import { entriesOf, isEntryValue } from '../src/index';

const entry = {
  name: 'Milk',
  categoryId: 'dairy',
  priority: 'soon',
  addedAt: '2026-11-20T08:00:00Z',
  origins: [{ kind: 'recipe', app: 'culina', title: 'Pancakes' }],
};

describe('isEntryValue', () => {
  it('takes an entry with fields of another app', () => {
    expect(isEntryValue({ ...entry, extra: { x: 1 } })).toBe(true);
  });

  it.each([
    ['an empty name', { ...entry, name: '  ' }],
    ['an unknown priority', { ...entry, priority: 'urgent' }],
    ['no origin', { ...entry, origins: [] }],
    ['a recipe origin without a title', { ...entry, origins: [{ kind: 'recipe', app: 'culina' }] }],
    ['a time without a zone', { ...entry, addedAt: '2026-11-20T08:00:00' }],
    ['a bought mark without a time', { ...entry, bought: {} }],
    ['a stock value', { present: true }],
  ])('refuses %s', (_what, value) => {
    expect(isEntryValue(value)).toBe(false);
  });
});

describe('entriesOf', () => {
  it('gives the live entries with their keys as ids, nothing else', () => {
    const at = '2026-11-20T08:00:00.000Z';
    expect(
      entriesOf([
        { key: 'a', updatedAt: at, value: entry },
        { key: 'b', updatedAt: at, deleted: true },
        { key: 'c', updatedAt: at, value: { present: true } },
      ]),
    ).toEqual([{ ...entry, id: 'a' }]);
  });
});
