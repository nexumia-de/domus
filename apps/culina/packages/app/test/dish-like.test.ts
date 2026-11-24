// "Dishes like this" (src/browse/alike.ts): the measure on written entries, and what it gives on
// the shipped dishes. Not proved here: what a cook thinks of the matches (every character is a
// judgement of the table, and so is the measure), and any notebook of a real user.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { isDishOfItsOwn, withoutAlternatives } from '@culina/engine';
import {
  LIKE_MAX,
  LIKE_MIN_SCORE,
  LIKE_MIN_SHARED,
  dishesLike,
  likeness,
  type LikeEntry,
} from '../src/browse/alike';
import { entryOfClassic, entryOfDish } from '../src/browse/entry';
import { belowOf } from '../src/characters/classes';
import { factsOfClassic } from '../src/characters/classic';
import { characterIds } from '../src/characters/view';
import { CLASSICS, FRAMES } from '../src/classics/index';
import type { DishRecord, IngredientRecord, Notebook } from '../src/records';

const e = (key: string, characters: string[], more: Partial<LikeEntry> = {}): LikeEntry => ({
  key,
  characters,
  ...more,
});

const keys = (list: { entry: LikeEntry }[]): string[] => list.map((a) => a.entry.key);

describe('the measure on written entries', () => {
  test('the thresholds are what docs/behaviour.md states', () => {
    expect([LIKE_MIN_SHARED, LIKE_MIN_SCORE, LIKE_MAX]).toEqual([2, 0.5, 5]);
  });

  test('two shared characters of three either has is a match; its score is the share', () => {
    const a = likeness(
      e('own:a', ['cheesy', 'baked', 'creamy']),
      e('shipped:b', ['cheesy', 'baked']),
    );
    expect(a?.shared).toEqual(['cheesy', 'baked']);
    expect(a?.score).toBeCloseTo(2 / 3);
  });

  test('one shared character is never enough, even when it is all either has', () => {
    expect(likeness(e('own:a', ['sweet']), e('own:b', ['sweet']))).toBeUndefined();
  });

  test('two shared of five is below the share: nothing, not a weak match', () => {
    // Control beside it: the same two of four is exactly the share and passes.
    const dish = e('own:a', ['tomatoey', 'garlicky', 'lemony']);
    expect(likeness(dish, e('own:b', ['tomatoey', 'garlicky', 'fried', 'creamy']))).toBeUndefined();
    expect(likeness(dish, e('own:c', ['tomatoey', 'garlicky', 'fried']))?.score).toBe(0.5);
  });

  test('with meat, with fish and uncooked are not counted', () => {
    expect(
      likeness(
        e('own:a', ['with-meat', 'with-fish', 'uncooked']),
        e('own:b', ['with-meat', 'with-fish', 'uncooked']),
      ),
    ).toBeUndefined();
    // They do not dilute the share either: two shared of the two counted is 1.
    expect(
      likeness(
        e('own:a', ['tomatoey', 'with-meat', 'fried']),
        e('own:b', ['tomatoey', 'fried', 'uncooked']),
      )?.score,
    ).toBe(1);
  });

  test('a dish with no characters has no like', () => {
    expect(dishesLike(e('own:a', []), [e('own:b', []), e('own:c', ['sweet', 'baked'])])).toEqual(
      [],
    );
  });

  test('another course is never like it; a dish without a course is compared', () => {
    const dish = e('own:a', ['sweet', 'baked'], { course: 'dessert' });
    expect(likeness(dish, e('own:b', ['sweet', 'baked'], { course: 'main' }))).toBeUndefined();
    expect(likeness(dish, e('own:c', ['sweet', 'baked']))).toBeDefined();
    expect(likeness(dish, e('own:d', ['sweet', 'baked'], { course: 'dessert' }))).toBeDefined();
  });

  test('the dish itself, and a shipped dish and its kept copy, are never like each other', () => {
    const shipped = e('shipped:gratin', ['cheesy', 'baked']);
    const copy = e('own:x', ['cheesy', 'baked'], { copyOf: 'gratin' });
    const other = e('own:y', ['cheesy', 'baked'], { copyOf: 'gratin' });
    expect(likeness(shipped, shipped)).toBeUndefined();
    expect(likeness(shipped, copy)).toBeUndefined();
    expect(likeness(copy, shipped)).toBeUndefined();
    expect(likeness(copy, other)).toBeUndefined();
    // Control: an own dish not kept from it is compared.
    expect(likeness(shipped, e('own:z', ['cheesy', 'baked']))).toBeDefined();
  });

  test('ranked by share, then shared count, then meat flag, then cuisine, then list order', () => {
    const dish = e('own:a', ['cheesy', 'baked', 'creamy', 'crisp'], {
      meatFree: true,
      cuisine: 'fr',
    });
    const list = [
      e('own:half', ['cheesy', 'baked']), // 2 of 4
      e('own:three', ['cheesy', 'baked', 'creamy']), // 3 of 4
      e('own:meat', ['cheesy', 'baked', 'creamy', 'crisp'], { meatFree: false, cuisine: 'fr' }),
      e('own:it', ['cheesy', 'baked', 'creamy', 'crisp'], { meatFree: true, cuisine: 'it' }),
      e('own:fr', ['cheesy', 'baked', 'creamy', 'crisp'], { meatFree: true, cuisine: 'fr' }),
      e('own:fr2', ['cheesy', 'baked', 'creamy', 'crisp'], { meatFree: true, cuisine: 'fr' }),
    ];
    expect(keys(dishesLike(dish, list, 10))).toEqual([
      'own:fr',
      'own:fr2',
      'own:it',
      'own:meat',
      'own:three',
      'own:half',
    ]);
    expect(dishesLike(dish, list)).toHaveLength(5);
  });
});

test('a dish kept from a shipped dish carries its id in the entry; others do not', () => {
  const nb: Notebook = {
    ingredients: [],
    components: [],
    dishes: [],
    facts: {},
  } as unknown as Notebook;
  const base = {
    id: 'd1',
    name: 'Gratin',
    slots: [],
    version: { family: 'f', date: '2026-11-24' },
  };
  const kept = { ...base, 'x-origin': { classic: 'gratin-dauphinois', own: true, year: 2026 } };
  expect(entryOfDish(nb, kept as unknown as DishRecord, () => undefined).copyOf).toBe(
    'gratin-dauphinois',
  );
  expect(entryOfDish(nb, base as unknown as DishRecord, () => undefined).copyOf).toBeUndefined();
});

describe('on the shipped dishes', () => {
  const file = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
      'utf8',
    ),
  ) as { ingredients: IngredientRecord[] };
  const byId = new Map(file.ingredients.map((r) => [r.id, r]));
  const lookup = (id: string): IngredientRecord | undefined => byId.get(id);
  const below = belowOf(file.ingredients);
  // As the lists show them: the dishes of their own (no sauce base), frames as they come.
  const entries = [...CLASSICS, ...FRAMES]
    .filter(isDishOfItsOwn)
    .map(withoutAlternatives)
    .map((c) => ({
      ...entryOfClassic(c, lookup, 'en'),
      characters: characterIds(factsOfClassic(c, lookup, below)),
    }));
  const like = (id: string): string[] => {
    const dish = entries.find((x) => x.id === id);
    if (dish === undefined) throw new Error(id);
    return dishesLike(dish, entries).map((a) => a.entry.id);
  };

  test('gratin dauphinois: the other two cheese gratins, potatoes first', () => {
    // All three are sides, cheesy, from the oven and creamy; the cauliflower is also crisp, so it
    // shares three of four.
    expect(like('gratin-dauphinois')).toEqual(['baked-potatoes-cheese', 'cavolfiore-balsamella']);
  });

  test('crème caramel: latte brûlé first, the other egg custards after', () => {
    // Eggy and sweet desserts; latte brûlé has exactly those two, the others are also creamy.
    expect(like('creme-caramel')).toEqual([
      'latte-brule',
      'oeufs-a-la-neige',
      'huevos-amerengados',
      'crema-cotta',
    ]);
  });

  test('Napfkuchen: the other cake, and nothing else that is sweet and baked', () => {
    // Flan and baked apples are sweet and baked too, but desserts, not baking.
    expect(like('napfkuchen')).toEqual(['torta-mantovana']);
  });

  test('chana masala: the plate built on it, by tomato and heat', () => {
    expect(like('chana-masala')).toEqual(['chana-masala-plate']);
  });

  test('controls: no like where little is known or only meat is shared', () => {
    // Pot-au-feu and cocido are both only "with meat"; Bratkartoffeln has no character; red
    // berry pudding is only sweet.
    expect(like('pot-au-feu')).toEqual([]);
    expect(like('cocido-ordinario')).toEqual([]);
    expect(like('bratkartoffeln')).toEqual([]);
    expect(like('rote-gruetze')).toEqual([]);
  });

  test('uncooked carries no match: tomato eggs and pizza are not alike', () => {
    // Both are said tomatoey and uncooked (their heat steps are plain actions); with uncooked
    // counted they would match at one half.
    expect(like('fanqie-chao-dan')).not.toContain('pizza-margherita');
    expect(like('pizza-margherita')).toEqual([]);
  });

  test('27 of the 121 dishes get a like at all', () => {
    // 27 of 121 on 2026-11-24, pinned exactly: a new shipped dish or a changed character rule
    // changes it, and then docs/behaviour.md is to be updated with it.
    const some = entries.filter((x) => dishesLike(x, entries).length > 0).length;
    expect(entries).toHaveLength(121);
    expect(some).toBe(27);
  });
});
