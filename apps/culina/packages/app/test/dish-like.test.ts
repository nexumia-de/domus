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
  likeInput,
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
    const dish = e('own:a', ['tomatoey', 'fried', 'lemony']);
    expect(likeness(dish, e('own:b', ['tomatoey', 'fried', 'baked', 'creamy']))).toBeUndefined();
    expect(likeness(dish, e('own:c', ['tomatoey', 'fried', 'baked']))?.score).toBe(0.5);
  });

  test('with meat and with fish are not counted; uncooked is', () => {
    expect(
      likeness(e('own:a', ['with-meat', 'with-fish']), e('own:b', ['with-meat', 'with-fish'])),
    ).toBeUndefined();
    // They do not dilute the share either: two shared of the two counted is 1.
    expect(
      likeness(e('own:a', ['tomatoey', 'with-meat', 'fried']), e('own:b', ['tomatoey', 'fried']))
        ?.score,
    ).toBe(1);
    expect(
      likeness(e('own:a', ['cheesy', 'uncooked']), e('own:b', ['cheesy', 'uncooked']))?.shared,
    ).toEqual(['cheesy', 'uncooked']);
  });

  test('seasoning alone is no likeness: one shared character must be another', () => {
    const dal = e('own:dal', ['tomatoey', 'garlicky', 'lemony']);
    expect(likeness(dal, e('own:tacos', ['tomatoey', 'garlicky', 'lemony']))).toBeUndefined();
    expect(
      likeness(e('own:a', ['spicy', 'lemony']), e('own:b', ['spicy', 'lemony'])),
    ).toBeUndefined();
    // Control: the same seasoning with one shared character of another kind is a match.
    expect(
      likeness(
        e('own:a', ['tomatoey', 'garlicky', 'fried']),
        e('own:b', ['tomatoey', 'garlicky', 'fried']),
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

  test('a frame and a recipe that is one of its parts, or a copy of one, are never alike', () => {
    const frame = e('shipped:plate', ['cheesy', 'baked'], { parts: ['gratin', 'salad'] });
    const part = e('shipped:gratin', ['cheesy', 'baked']);
    const copy = e('own:x', ['cheesy', 'baked'], { copyOf: 'salad' });
    expect(likeness(frame, part)).toBeUndefined();
    expect(likeness(part, frame)).toBeUndefined();
    expect(likeness(frame, copy)).toBeUndefined();
    // Control: a recipe that is no part of it is compared.
    expect(likeness(frame, e('shipped:other', ['cheesy', 'baked']))).toBeDefined();
  });

  test('the like input: the entry as shown, the key of the lists, the parts of the lists', () => {
    const shown = e('own:v2', ['cheesy', 'baked'], { course: 'main' });
    const listed = e('shipped:plate', [], { parts: ['gratin'] });
    expect(likeInput(shown, 'own:head', undefined)).toEqual({ ...shown, key: 'own:head' });
    expect(likeInput(shown, 'shipped:plate', listed).parts).toEqual(['gratin']);
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
  // As the lists show them: the dishes of their own (no sauce base), a frame as shipped, with the
  // parts of the file with its alternatives (as src/browse/entries.ts does).
  const entries = [...CLASSICS, ...FRAMES].filter(isDishOfItsOwn).map((source) => {
    const c = withoutAlternatives(source);
    return {
      ...entryOfClassic(c, lookup, 'en', source),
      characters: characterIds(factsOfClassic(c, lookup, below)),
    };
  });
  const entry = (id: string) => {
    const dish = entries.find((x) => x.id === id);
    if (dish === undefined) throw new Error(id);
    return dish;
  };
  const like = (id: string): string[] => dishesLike(entry(id), entries).map((a) => a.entry.id);
  const alike = (a: string, b: string): boolean =>
    likeness(entry(a), entry(b)) !== undefined || likeness(entry(b), entry(a)) !== undefined;

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

  test('a frame is never like a recipe that is one of its parts, chosen or an alternative', () => {
    // The same dish, not a like one. The first three matched before 2026-11-24's review; the
    // burrito shares too little with pollo deshebrado to match either way.
    expect(alike('chana-masala', 'chana-masala-plate')).toBe(false);
    expect(alike('souvlaki-kotopoulo', 'souvlaki-plate')).toBe(false);
    expect(alike('pollo-deshebrado-en-jitomate', 'tacos')).toBe(false);
    expect(alike('pollo-deshebrado-en-jitomate', 'burrito')).toBe(false);
    // An alternative of a slot counts: the rice bowl's parts include the salmon it can take.
    expect(entry('rice-bowl').parts).toEqual(
      expect.arrayContaining(['tofu-suteki', 'sake-no-shioyaki']),
    );
  });

  test('seasoning alone: dal, tacos, souvlaki and pollo deshebrado are not alike', () => {
    // They share only tomatoey, garlicky or lemony; dal and tacos scored 1 before.
    expect(alike('masoor-dal-tadka', 'tacos')).toBe(false);
    expect(alike('souvlaki-kotopoulo', 'masoor-dal-tadka')).toBe(false);
    expect(alike('souvlaki-kotopoulo', 'tacos')).toBe(false);
    expect(alike('pollo-deshebrado-en-jitomate', 'masoor-dal-tadka')).toBe(false);
    // Controls: pairs that share more than seasoning.
    expect(alike('gratin-dauphinois', 'baked-potatoes-cheese')).toBe(true);
    expect(alike('oeufs-a-la-neige', 'huevos-amerengados')).toBe(true);
    expect(alike('napfkuchen', 'torta-mantovana')).toBe(true);
  });

  test('uncooked, now said only of what is not cooked, makes the raw salads alike', () => {
    // Horiatiki and çoban salatası share tomatoey and uncooked; kachumber and çoban also lemony.
    expect(like('coban-salatasi')).toEqual(['kachumber', 'horiatiki']);
    expect(like('horiatiki')).toEqual(['coban-salatasi']);
  });

  test('controls: no like where little is known or only meat is shared', () => {
    // Pot-au-feu and cocido are both only "with meat"; Bratkartoffeln has no character; red
    // berry pudding is only sweet.
    expect(like('pot-au-feu')).toEqual([]);
    expect(like('cocido-ordinario')).toEqual([]);
    expect(like('bratkartoffeln')).toEqual([]);
    expect(like('rote-gruetze')).toEqual([]);
  });

  test('tomato eggs and pizza are not alike: neither is uncooked any more', () => {
    // Before the rule read plain actions, both were tomatoey and uncooked and matched at one half.
    expect(alike('fanqie-chao-dan', 'pizza-margherita')).toBe(false);
    expect(like('pizza-margherita')).toEqual([]);
  });

  test('over every pair: never itself, never across courses, never a frame with its part', () => {
    // Invariants instead of a count, so that a new dish does not need a test changed.
    for (const dish of entries) {
      const like = dishesLike(dish, entries);
      expect(like.length).toBeLessThanOrEqual(LIKE_MAX);
      for (const { entry, shared, score } of like) {
        expect(entry.key).not.toBe(dish.key);
        expect(entry.course).toBe(dish.course);
        expect(shared.length).toBeGreaterThanOrEqual(LIKE_MIN_SHARED);
        expect(score).toBeGreaterThanOrEqual(LIKE_MIN_SCORE);
        expect(dish.parts ?? []).not.toContain(entry.id);
        expect(entry.parts ?? []).not.toContain(dish.id);
        // Symmetric: the other dish finds this one alike, with the same score.
        expect(likeness(entry, dish)?.score).toBe(score);
      }
    }
  });
});
