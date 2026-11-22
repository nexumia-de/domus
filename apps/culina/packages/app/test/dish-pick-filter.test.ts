// The random pick under the one filter (docs/behaviour.md, "Alternatives and the random pick"):
// "Surprise me with a dish" over the entries of both origins, and the roll per role among the
// combinations that are like the chosen character or without meat and fish. The random numbers
// are fixed; the classics and the catalogue are the shipped files, the notebook is built in memory.
// Not proved here: the screen, `Math.random`, and what the stock allows (that is the finder's).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { allEntries, entryOfDish } from '../src/browse/entry';
import { CLASSICS } from '../src/classics/index';
import { roleCandidates, type Candidate } from '../src/dishes/alternatives';
import {
  JUDGE_ALL_UP_TO,
  TRIES,
  rollFitting,
  rollRoleFitting,
  type Fits,
  type RolePick,
} from '../src/dishes/pick';
import { dishPool, surpriseDish } from '../src/dishes/pick-dish';
import { combinationDish, combinationJudge } from '../src/dishes/pick-judge';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord, DishRecord, IngredientRecord } from '../src/records';
import { must } from './must';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: IngredientRecord[] };
const byId = new Map(file.ingredients.map((r) => [r.id, r]));
const lookup = (id: string): IngredientRecord | undefined => byId.get(id);

/** A counter of the numbers taken, from a fixed list (the last one repeats). */
const numbers = (...list: number[]) => {
  let i = 0;
  const next = () => list[Math.min(i++, list.length - 1)] ?? 0;
  return Object.assign(next, { taken: () => i });
};

const component = (
  id: string,
  name: string,
  role: string,
  ingredient: string,
): ComponentRecord => ({
  id,
  name,
  role,
  lines: [
    { key: 'l1', ref: { kind: 'ingredient', id: ingredient }, amount: { value: 100, unit: 'g' } },
  ],
  version: { family: id, date: '2026-11-21' },
});

const BEEF = 'fdc-168694';
const ONION = 'fdc-170000';
const POTATO = 'fdc-170028';
const RICE = 'fdc-168877';
const TOMATO = 'fdc-170457';
const CHUCK = 'fdc-169491';

const nb = buildNotebook(
  [],
  [
    component('u-patty', 'Patties', 'main', BEEF),
    component('u-onion', 'Onion bake', 'main', ONION),
    component('u-mash', 'Mash', 'starch', POTATO),
    component('u-rice', 'Rice', 'starch', RICE),
    component('u-tomato', 'Tomato sauce', 'sauce', TOMATO),
    component('u-gravy', 'Beef gravy', 'sauce', CHUCK),
  ],
);
const ALL = roleCandidates(nb);
const free = { onlyStock: false, inStock: () => false };
const ROLES = ['main', 'starch', 'sauce'];
const named = (picks: readonly { choice?: Candidate }[]) => picks.map((p) => p.choice?.name);

describe('surprise me with a dish', () => {
  const own: DishRecord = {
    id: 'u-plate',
    name: 'Patties with mash',
    slots: [
      { role: 'main', ref: { kind: 'component', id: 'u-patty' } },
      { role: 'starch', ref: { kind: 'component', id: 'u-mash' } },
    ],
    version: { family: 'u-plate', date: '2026-11-21' },
  };
  const entries = allEntries(nb, [own], CLASSICS, lookup, 'en');

  test('every dish of the pool, of both origins, can come up', () => {
    const pool = dishPool(entries, {});
    expect(pool).toHaveLength(entries.length);
    const seen = new Set(pool.map((_, i) => surpriseDish(pool, (i + 0.5) / pool.length)?.key));
    expect(seen).toEqual(new Set(pool.map((e) => e.key)));
    expect(seen.has('own:u-plate')).toBe(true);
    expect([...seen].some((k) => k?.startsWith('shipped:') === true)).toBe(true);
  });

  test('the filter narrows the pool, and the pick stays in it', () => {
    const italian = dishPool(entries, { cuisine: 'it' });
    expect(italian.length).toBeGreaterThan(0);
    expect(italian.length).toBeLessThan(entries.length);
    for (const r of [0, 0.3, 0.6, 0.99]) expect(surpriseDish(italian, r)?.cuisine).toBe('it');
    expect(dishPool(entries, { origin: 'own' }).map((e) => e.key)).toEqual(['own:u-plate']);
    const meatFree = dishPool(entries, { meatFree: true });
    expect(meatFree.every((e) => e.meatFree === true)).toBe(true);
    // Control: without the choice the meat-free dishes are only a part.
    expect(meatFree.length).toBeLessThan(entries.length);
  });

  test('what the stock allows narrows it further, by entry key', () => {
    const allowed = new Set(['own:u-plate', `shipped:${must(CLASSICS[0]).id}`]);
    expect(dishPool(entries, {}, allowed).map((e) => e.key)).toEqual([...allowed]);
    expect(dishPool(entries, { origin: 'shipped' }, allowed)).toHaveLength(1);
  });

  test('rolling again never gives the same dish when there is another', () => {
    const pool = dishPool(entries, { cuisine: 'it' });
    for (const e of pool)
      for (const r of [0, 0.25, 0.5, 0.75, 0.999])
        expect(surpriseDish(pool, r, e.key)?.key).not.toBe(e.key);
    // With one dish only, rolling again gives that dish.
    const one = dishPool(entries, { origin: 'own' });
    expect(surpriseDish(one, 0.7, 'own:u-plate')?.key).toBe('own:u-plate');
  });

  test('nothing fits: no dish', () => {
    const none = dishPool(entries, { origin: 'own', cuisine: 'it' });
    expect(none).toEqual([]);
    expect(surpriseDish(none, 0.5)).toBeUndefined();
  });
});

describe('the roll per role under the filter', () => {
  test('the combination is judged as a dish of the notebook would be', () => {
    const dish = combinationDish([
      must(ALL.find((c) => c.id === 'u-tomato')),
      must(ALL.find((c) => c.id === 'u-patty')),
    ]);
    expect(dish.slots.map((s) => s.role)).toEqual(['main', 'sauce']);
    expect(dish.slots.every((s) => s.amount === undefined)).toBe(true);
    // Course, cuisine, origin and "every amount" judge nothing: no judge.
    expect(
      combinationJudge(nb, lookup, { course: 'main', cuisine: 'it', origin: 'own' }),
    ).toBeUndefined();
  });

  test('without meat and fish: only the combinations that are, each of them reachable', () => {
    const fits = must(combinationJudge(nb, lookup, { meatFree: true }));
    const seen = new Set<string>();
    for (const r of [0.1, 0.6]) {
      const random = numbers(r);
      const rolled = rollFitting(ROLES, ALL, free, random, fits);
      if (!rolled.found) throw new Error('none found');
      // Eight combinations are judged; one number picks among those that fit.
      expect(random.taken()).toBe(1);
      const choices = rolled.picks.map((p) => must(p.choice));
      expect(entryOfDish(nb, combinationDish(choices), lookup).meatFree).toBe(true);
      seen.add(named(rolled.picks).join('+'));
    }
    expect(seen).toEqual(new Set(['Onion bake+Mash+Tomato sauce', 'Onion bake+Rice+Tomato sauce']));
  });

  test('a character: only the combinations that have it; without a filter all eight', () => {
    const fits = must(combinationJudge(nb, lookup, { character: 'tomatoey' }));
    const seen = new Set<string>();
    for (const r of [0, 0.3, 0.55, 0.8]) {
      const rolled = rollFitting(ROLES, ALL, free, numbers(r), fits);
      if (!rolled.found) throw new Error('none found');
      expect(rolled.picks[2]?.choice?.name).toBe('Tomato sauce');
      seen.add(named(rolled.picks).join('+'));
    }
    expect(seen.size).toBe(4);
    // Control: a judge that takes everything reaches the beef gravy too.
    const any = rollFitting(ROLES, ALL, free, numbers(0), () => true);
    expect(any.found && any.picks[2]?.choice?.name).toBe('Beef gravy');
  });

  test('rolling a role again stays within what fits, and gives another', () => {
    const fits = must(combinationJudge(nb, lookup, { meatFree: true }));
    const rolled = rollFitting(ROLES, ALL, free, numbers(0), fits);
    if (!rolled.found) throw new Error('none found');
    expect(named(rolled.picks)).toEqual(['Onion bake', 'Mash', 'Tomato sauce']);
    // Only the starch has a second that fits; main and sauce have one each.
    expect(rolled.picks.map((p) => p.of)).toEqual([1, 2, 1]);
    for (const r of [0, 0.5, 0.99]) {
      const again = rollRoleFitting('starch', rolled.picks, ALL, free, numbers(r), fits);
      expect(named(again)).toEqual(['Onion bake', 'Rice', 'Tomato sauce']);
    }
    // The main has no other that fits: it stays.
    const main = rollRoleFitting('main', rolled.picks, ALL, free, numbers(0.9), fits);
    expect(named(main)).toEqual(['Onion bake', 'Mash', 'Tomato sauce']);
  });

  test('none found: every combination was judged and none is like that', () => {
    const fits = must(combinationJudge(nb, lookup, { character: 'with-fish' }));
    const random = numbers(0.5);
    expect(rollFitting(ROLES, ALL, free, random, fits)).toEqual({
      found: false,
      combinations: 8,
      all: true,
      tries: 8,
    });
    expect(random.taken()).toBe(1);
  });

  test('a role without a candidate stays empty and is not part of the combination', () => {
    const fits = must(combinationJudge(nb, lookup, { meatFree: true }));
    const rolled = rollFitting(['main', 'crunch'], ALL, free, numbers(0), fits);
    expect(rolled.found && rolled.picks).toEqual([
      { role: 'main', choice: ALL.find((c) => c.id === 'u-onion'), of: 1 },
      { role: 'crunch', of: 0 },
    ]);
    const nothing = numbers(0);
    expect(rollFitting(['crunch'], ALL, free, nothing, fits)).toEqual({
      found: true,
      picks: [{ role: 'crunch', of: 0 }],
    });
    expect(nothing.taken()).toBe(0);
  });

  test('above the bound, a fixed number of combinations is drawn by chance', () => {
    // Three roles of six: 216 combinations, more than are judged one by one.
    const many: Candidate[] = ['a', 'b', 'c'].flatMap((role) =>
      [0, 1, 2, 3, 4, 5].map((n) => ({ id: `${role}${n}`, name: `${role}${n}`, role })),
    );
    expect(6 ** 3).toBeGreaterThan(JUDGE_ALL_UP_TO);
    const lastOnly: Fits = (choices) => choices.every((c) => c.id.endsWith('5'));
    // The second draw (numbers 4-6) is the one that fits.
    const lucky = numbers(0, 0, 0, 0.99, 0.99, 0.99);
    const found = rollFitting(['a', 'b', 'c'], many, free, lucky, lastOnly);
    expect(found.found && named(found.picks)).toEqual(['a5', 'b5', 'c5']);
    expect(lucky.taken()).toBe(6);
    // A draw that never fits stops after the stated number of tries.
    const unlucky = numbers(0);
    expect(rollFitting(['a', 'b', 'c'], many, free, unlucky, lastOnly)).toEqual({
      found: false,
      combinations: 216,
      all: false,
      tries: TRIES,
    });
    expect(unlucky.taken()).toBe(TRIES * 3);
  });
});

// From the review of 3b9d11e: the picks were handed out by position among the roles that had a
// candidate under the options at the time, so a change of the stock option between Roll and
// "Roll again" moved a component into another role's row.
describe('every pick stays in its own role', () => {
  const C = (id: string, role: string): Candidate => ({ id, name: id, role });
  const SET = [
    C('patty', 'main'),
    C('onion', 'main'),
    C('mash', 'starch'),
    C('gravy', 'sauce'),
    C('tomato', 'sauce'),
  ];
  const off = { onlyStock: false, inStock: () => false };
  const noMash = { onlyStock: true, inStock: (id: string) => id !== 'mash' };
  const anything: Fits = () => true;
  const inOwnRole = (picks: readonly RolePick[]) =>
    picks.every((p) => p.choice === undefined || p.choice.role === p.role);

  test('the stock option turned on after the roll: rolling the main again moves nothing', () => {
    const rolled = rollFitting(ROLES, SET, off, () => 0, anything);
    if (!rolled.found) throw new Error('none found');
    expect(named(rolled.picks)).toEqual(['patty', 'mash', 'gravy']);
    const again = rollRoleFitting('main', rolled.picks, SET, noMash, () => 0, anything);
    expect(inOwnRole(again)).toBe(true);
    expect(named(again)).toEqual(['onion', 'mash', 'gravy']);
  });

  test("the stock option turned off after the roll: an empty role takes no other role's pick", () => {
    const rolled = rollFitting(ROLES, SET, noMash, () => 0, anything);
    if (!rolled.found) throw new Error('none found');
    expect(named(rolled.picks)).toEqual(['patty', undefined, 'gravy']);
    const again = rollRoleFitting('main', rolled.picks, SET, off, () => 0.99, anything);
    expect(inOwnRole(again)).toBe(true);
    expect(named(again)).toEqual(['onion', undefined, 'gravy']);
  });

  test('nothing in stock: rolling a role again keeps every pick', () => {
    const rolled = rollFitting(ROLES, SET, off, () => 0, anything);
    if (!rolled.found) throw new Error('none found');
    const nothing = { onlyStock: true, inStock: () => false };
    const again = rollRoleFitting('starch', rolled.picks, SET, nothing, () => 0.5, anything);
    expect(named(again)).toEqual(['patty', 'mash', 'gravy']);
  });

  test('under a judge the draw is even over the combinations that fit, not over a role', () => {
    // Main {A, B}, sauce {x, y}; A+x, A+y and B+x fit: A comes up in two of three.
    const four = [C('A', 'main'), C('B', 'main'), C('x', 'sauce'), C('y', 'sauce')];
    const notBy: Fits = (choices) =>
      !(choices.some((c) => c.id === 'B') && choices.some((c) => c.id === 'y'));
    const mains = [0.1, 0.5, 0.9].map((r) => {
      const rolled = rollFitting(['main', 'sauce'], four, off, () => r, notBy);
      return rolled.found ? rolled.picks[0]?.choice?.id : undefined;
    });
    expect(mains).toEqual(['A', 'A', 'B']);
  });
});
