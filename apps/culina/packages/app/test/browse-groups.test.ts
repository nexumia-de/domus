// The groups of Cook's list in the order by name (src/browse/groups.ts): which row goes into which
// group, the order of the groups, when the list stays flat, and the line under a name in a group.
// On entries written by hand and on the shipped dishes. Not proved here: the headings in a browser
// (e2e/cook-groups.mjs), that the order of the courses is the one a cook wants (a judgement).
import { describe, expect, test } from 'vitest';
import { COURSE_IDS, isDishOfItsOwn } from '@culina/engine';
import type { DishEntry } from '../src/browse/entry';
import { entryOfClassic } from '../src/browse/entry';
import { GROUP_COURSES, groupRows } from '../src/browse/groups';
import { dishListView } from '../src/browse/list-view';
import { CLASSICS, FRAMES } from '../src/classics/index';

const entry = (
  over: Partial<DishEntry> & Pick<DishEntry, 'origin' | 'id' | 'name'>,
): DishEntry => ({
  key: `${over.origin}:${over.id}`,
  href: over.origin === 'own' ? `#/dishes/${over.id}` : `#/classic/${over.id}`,
  characters: [],
  complete: true,
  ...over,
});

const TACOS = entry({
  origin: 'shipped',
  id: 'tacos',
  name: 'Tacos',
  course: 'main',
  cuisine: 'mx',
  frame: true,
});
const GOULASH = entry({ origin: 'shipped', id: 'g', name: 'Goulash', course: 'main' });
const APPLE_CAKE = entry({ origin: 'shipped', id: 'c', name: 'Apple cake', course: 'baking' });
const BEANS = entry({ origin: 'shipped', id: 'b', name: 'Beans', course: 'side', cuisine: 'mx' });
const MINE = entry({ origin: 'own', id: 'm', name: 'A stew of mine' });
const OWN_SOUP = entry({ origin: 'own', id: 's', name: 'Soup of mine', course: 'soup' });
const ALL = [TACOS, GOULASH, APPLE_CAKE, BEANS, MINE, OWN_SOUP];

const grouped = (entries: readonly DishEntry[]) =>
  groupRows(dishListView(entries, {}, '', 'en').rows)?.map((g) => ({
    id: g.id,
    names: g.rows.map((r) => r.entry.name),
  }));

describe("Cook's groups", () => {
  test('frames first, then the courses with the main course first, then no course', () => {
    expect(grouped(ALL)).toEqual([
      { id: 'frames', names: ['Tacos'] },
      { id: 'main', names: ['Goulash'] },
      { id: 'soup', names: ['Soup of mine'] },
      { id: 'side', names: ['Beans'] },
      { id: 'baking', names: ['Apple cake'] },
      { id: 'none', names: ['A stew of mine'] },
    ]);
  });

  test('a frame is in the frames group, not in its course; own and shipped share a group', () => {
    const OWN_MAIN = entry({ origin: 'own', id: 'o', name: 'Hash', course: 'main' });
    expect(grouped([TACOS, GOULASH, OWN_MAIN])).toEqual([
      { id: 'frames', names: ['Tacos'] },
      { id: 'main', names: ['Goulash', 'Hash'] },
    ]);
  });

  test('within a group the order by name stays', () => {
    const A = entry({ origin: 'shipped', id: 'a', name: 'Zander', course: 'main' });
    const B = entry({ origin: 'own', id: 'b', name: 'apricot dumplings', course: 'main' });
    expect(grouped([A, B, APPLE_CAKE])?.[0]?.names).toEqual(['apricot dumplings', 'Zander']);
  });

  test('one group left is one flat list, without a heading; no rows too', () => {
    expect(grouped([GOULASH, entry({ origin: 'own', id: 'x', name: 'X', course: 'main' })])).toBe(
      undefined,
    );
    expect(grouped([TACOS])).toBe(undefined);
    expect(grouped([])).toBe(undefined);
  });

  // The control: two groups left give two groups, whatever narrowed the list.
  test('a filter that leaves two groups gives those two, an empty group is not there', () => {
    const view = dishListView(ALL, { course: 'main' }, '', 'en');
    expect(groupRows(view.rows)?.map((g) => [g.id, g.rows.length])).toEqual([
      ['frames', 1],
      ['main', 1],
    ]);
  });

  test('in a course group the line under a name drops the course; elsewhere it stays', () => {
    const groups = groupRows(dishListView(ALL, {}, '', 'en').rows) ?? [];
    const meta = (id: string) => groups.find((g) => g.id === id)?.rows[0]?.meta;
    expect(meta('frames')).toMatchObject({ course: 'main', cuisine: 'mx' });
    expect(meta('side')).not.toHaveProperty('course');
    expect(meta('side')).toMatchObject({ cuisine: 'mx', origin: 'shipped' });
    expect(meta('main')).not.toHaveProperty('course');
  });

  test('every course of the engine has its place once', () => {
    expect([...GROUP_COURSES].sort()).toEqual([...COURSE_IDS].sort());
  });
});

describe("Cook's groups of the shipped dishes", () => {
  const entries = [...CLASSICS, ...FRAMES]
    .filter(isDishOfItsOwn)
    .map((c) => entryOfClassic(c, () => undefined, 'en'));
  const groups = groupRows(dishListView(entries, {}, '', 'en').rows) ?? [];

  test('the eleven frames come first, every dish is in one group, no group is empty', () => {
    expect(entries).toHaveLength(113);
    expect(groups[0]?.id).toBe('frames');
    expect(groups[0]?.rows).toHaveLength(11);
    expect(groups[0]?.rows.map((r) => r.entry.id)).toContain('tacos');
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(113);
    expect(groups.every((g) => g.rows.length > 0)).toBe(true);
    expect(groups[1]?.id).toBe('main');
  });

  test('the groups follow the order of the courses', () => {
    const ids = groups.slice(1).map((g) => g.id);
    const order = ids.map((id) => GROUP_COURSES.indexOf(id as (typeof GROUP_COURSES)[number]));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i >= 0)).toBe(true);
  });
});
