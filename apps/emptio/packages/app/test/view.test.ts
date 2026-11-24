// What the list shows on this device: the urgencies that are shown, the four orders, the prefs
// text. Pure; the screen is checked in the browser.
import { describe, expect, test } from 'vitest';
import type { Entry } from '@nexumia-de/list';
import { arrange, countsOf, shownOf, shownText, sortOf, DEFAULT_VIEW } from '../src/list/view';

const entry = (id: string, name: string, priority: Entry['priority'], extra: Partial<Entry> = {}) =>
  ({
    id,
    name,
    categoryId: 'other',
    priority,
    addedAt: `2026-11-20T10:00:0${id}.000Z`,
    origins: [{ kind: 'typed' }],
    ...extra,
  }) as Entry;

const list = [
  entry('1', 'Zucker', 'soon'),
  entry('2', 'Äpfel', 'sometime'),
  entry('3', 'Brot', 'now', { categoryId: 'bakery' }),
  entry('4', 'Apfelsaft', 'soon'),
  entry('5', 'Salz', 'soon', { bought: { at: '2026-11-20T11:00:00.000Z' } }),
];
const order = ['bakery', 'other'];
const names = (view: Parameters<typeof arrange>[1]) =>
  arrange(list, view, order).map((e) => e.name);

describe('the view of the list', () => {
  test('by default Now and Soon are shown, Sometime is only counted', () => {
    expect(names(DEFAULT_VIEW)).toEqual(['Brot', 'Apfelsaft', 'Zucker']);
    expect(countsOf(list.filter((e) => e.bought === undefined))).toEqual({
      now: 1,
      soon: 2,
      sometime: 1,
    });
  });
  test('each urgency can be shown alone or together; bought entries are never in it', () => {
    expect(names({ shown: ['sometime'], sort: 'store' })).toEqual(['Äpfel']);
    expect(names({ shown: ['now', 'soon', 'sometime'], sort: 'name' })).toEqual([
      'Äpfel',
      'Apfelsaft',
      'Brot',
      'Zucker',
    ]);
    expect(names({ shown: [], sort: 'store' })).toEqual([]);
  });
  test('store is rule 1; urgency ignores the category; name ignores urgency; added is newest first', () => {
    const all = ['now', 'soon', 'sometime'] as const;
    expect(names({ shown: all, sort: 'store' })).toEqual(['Brot', 'Apfelsaft', 'Zucker', 'Äpfel']);
    expect(names({ shown: all, sort: 'urgency' })).toEqual([
      'Brot',
      'Apfelsaft',
      'Zucker',
      'Äpfel',
    ]);
    expect(names({ shown: all, sort: 'added' })).toEqual(['Apfelsaft', 'Brot', 'Äpfel', 'Zucker']);
    // Urgency by name: a bakery thing of Soon does not jump ahead of an Other thing of Soon.
    const more = [...list, entry('6', 'Kuchen', 'soon', { categoryId: 'bakery' })];
    expect(arrange(more, { shown: ['soon'], sort: 'urgency' }, order).map((e) => e.name)).toEqual([
      'Apfelsaft',
      'Kuchen',
      'Zucker',
    ]);
    expect(arrange(more, { shown: ['soon'], sort: 'store' }, order).map((e) => e.name)).toEqual([
      'Kuchen',
      'Apfelsaft',
      'Zucker',
    ]);
  });
  test('the arrangement never changes the entries', () => {
    const before = JSON.stringify(list);
    arrange(list, { shown: ['now', 'soon', 'sometime'], sort: 'name' }, order);
    expect(JSON.stringify(list)).toBe(before);
  });
  test('the prefs text round-trips; junk gives the default or an empty choice', () => {
    expect(shownOf(shownText(['now', 'sometime']))).toEqual(['now', 'sometime']);
    expect(shownOf(null)).toEqual(['now', 'soon']);
    expect(shownOf('')).toEqual([]);
    expect(shownOf('x,soon')).toEqual(['soon']);
    expect(sortOf('name')).toBe('name');
    expect(sortOf('x')).toBe('store');
  });
});
