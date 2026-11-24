// The one entry and the one filter over every dish: shipped classics and dishes of the notebook.
// The classics and the catalogue are the shipped files; the notebook is built in memory, and the
// store of the filter is a plain object. Not proved here: the controls in a browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { COUNTRY_CODES } from '@culina/engine';
import { allEntries, entryOfClassic, entryOfDish } from '../src/browse/entry';
import {
  isEmptyFilter,
  matchesFilter,
  matchesQuery,
  offeredBy,
  parseDishFilter,
  readDishFilter,
  writeDishFilter,
} from '../src/browse/filter';
import { CLASSICS } from '../src/classics/index';
import type { DishRecord, IngredientRecord, Notebook } from '../src/records';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: IngredientRecord[] };
const byId = new Map(file.ingredients.map((r) => [r.id, r]));
const lookup = (id: string): IngredientRecord | undefined => byId.get(id);

const TOMATO = 'fdc-170457';
const version = { family: 'f', date: '2026-11-21', change: '' };
const dish = (id: string, slots: DishRecord['slots']): DishRecord =>
  ({ id, name: `Dish ${id}`, slots, version }) as DishRecord;
const notebook: Notebook = {
  ingredients: [],
  components: [],
  dishes: [],
  facts: {},
} as unknown as Notebook;

const tomatoDish = dish('a', [
  { role: 'main', ref: { kind: 'ingredient', id: TOMATO }, amount: { value: 200, unit: 'g' } },
] as DishRecord['slots']);
const unknownDish = dish('b', [
  { role: 'main', ref: { kind: 'ingredient', id: 'u-made-up' } },
] as DishRecord['slots']);

describe('entries', () => {
  test('a dish of the notebook: its origin, its link, characters, and meat-free only when every line is known', () => {
    const a = entryOfDish(notebook, tomatoDish, lookup);
    expect(a).toMatchObject({ key: 'own:a', origin: 'own', href: '#/dishes/a', complete: true });
    expect(a.characters).toContain('tomatoey');
    expect(a.meatFree).toBe(true);
    const b = entryOfDish(notebook, unknownDish, lookup);
    expect(b.meatFree).toBeUndefined();
    expect(b.complete).toBe(false);
  });

  test('a dish of the notebook carries the course and cuisine it states, and none it does not', () => {
    const stated = entryOfDish(notebook, { ...tomatoDish, course: 'soup', cuisine: 'it' }, lookup);
    expect(stated).toMatchObject({ course: 'soup', cuisine: 'it' });
    const bare = entryOfDish(notebook, tomatoDish, lookup);
    expect('course' in bare || 'cuisine' in bare).toBe(false);
  });

  test('the course and cuisine filter keep own and shipped dishes alike', () => {
    const own = { ...tomatoDish, course: 'main' as const, cuisine: 'it' as const };
    const all = allEntries(notebook, [own, unknownDish], CLASSICS, lookup, 'en');
    const kept = all.filter((e) => matchesFilter(e, { course: 'main', cuisine: 'it' }));
    expect(kept.some((e) => e.key === 'own:a')).toBe(true);
    expect(kept.some((e) => e.key === 'own:b')).toBe(false);
    expect(kept.every((e) => e.course === 'main' && e.cuisine === 'it')).toBe(true);
    const offered = offeredBy(allEntries(notebook, [own], [], lookup, 'en'), {
      characters: [],
      courses: ['soup', 'main'],
      cuisines: ['de', 'it'],
    });
    expect(offered.courses).toEqual(['main']);
    expect(offered.cuisines).toEqual(['it']);
  });

  test('a shipped classic carries its course, its country as the cuisine and its hand-set meat-free', () => {
    const classic = CLASSICS[0];
    if (classic === undefined) throw new Error('no classics');
    const e = entryOfClassic(classic, lookup, 'en');
    expect(e).toMatchObject({
      key: `shipped:${classic.id}`,
      origin: 'shipped',
      href: `#/classic/${classic.id}`,
      course: classic.course,
      cuisine: classic.country,
      meatFree: classic.vegetarian,
    });
  });

  test('a shipped dish is complete when every ingredient line has an amount; a slot filled by a component asks none', () => {
    const complete = CLASSICS.filter((c) => entryOfClassic(c, lookup, 'en').complete).map(
      (c) => c.id,
    );
    expect(complete.sort()).toEqual([
      'achat',
      'arroz-rojo',
      'bai-mi-fan',
      'barbecue-sauce',
      'basmati-chawal',
      'bratkartoffeln',
      'bulgur-pilavi',
      'buttermilk-pancakes',
      'chana-masala',
      'chao-cai-jiang',
      'chapati',
      'coban-salatasi',
      'cocido-ordinario',
      'coleslaw',
      'crepes',
      'dan-chao-fan',
      'fanqie-chao-dan',
      'frijoles-refritos',
      'gambas-al-ajillo',
      'gohan',
      'guacamole',
      'hamburger-patties',
      'horiatiki',
      'impasto-per-pizza',
      'kachumber',
      'kaeng-phet-kai',
      'khao-suai',
      'kofte',
      'kyuri-no-sunomono',
      'ladolemono',
      'macaroni-a-l-italienne-maigre',
      'macaroni-and-cheese',
      'mashed-potatoes',
      'masoor-dal-tadka',
      'mercimek-corbasi',
      'miso-shiru',
      'murgh-masala',
      'nam-chim-kai',
      'nam-chim-satay',
      'onion-gravy',
      'pai-huanggua',
      'patatas-bravas',
      'patates-lemonates',
      'pesto-genovese',
      'pico-de-gallo',
      'pollo-deshebrado-en-jitomate',
      'pommes-de-terre-au-lait',
      'pot-au-feu',
      'quiche-lorraine',
      'rahmchampignons',
      'raita',
      'ratatouille',
      'roast-potatoes',
      'rote-gruetze',
      'sake-no-shioyaki',
      'sauce-blanche',
      'soupe-aux-poireaux',
      'souvlaki-kotopoulo',
      'tamagoyaki',
      'teriyaki-no-tare',
      'tortillas-de-harina',
      'tzatziki',
      'vinaigrette-moutarde',
    ]);
  });

  test('all entries: the notebook first, then every classic', () => {
    const all = allEntries(notebook, [tomatoDish], CLASSICS, lookup, 'de');
    expect(all).toHaveLength(1 + CLASSICS.length);
    expect(all[0]?.origin).toBe('own');
    expect(new Set(all.map((e) => e.key)).size).toBe(all.length);
  });
});

describe('filter', () => {
  const all = allEntries(notebook, [tomatoDish, unknownDish], CLASSICS, lookup, 'en');

  test('the empty filter keeps everything; each choice only drops entries', () => {
    expect(isEmptyFilter({})).toBe(true);
    expect(all.every((e) => matchesFilter(e, {}))).toBe(true);
    expect(all.filter((e) => matchesFilter(e, { origin: 'own' }))).toHaveLength(2);
    const soups = all.filter((e) => matchesFilter(e, { course: 'soup' }));
    expect(soups.length).toBeGreaterThan(0);
    expect(soups.every((e) => e.course === 'soup')).toBe(true);
    const italian = all.filter((e) => matchesFilter(e, { cuisine: 'it' }));
    expect(italian).toHaveLength(CLASSICS.filter((c) => c.country === 'it').length);
  });

  test('without meat and fish keeps only what is known to be so', () => {
    const kept = all.filter((e) => matchesFilter(e, { meatFree: true }));
    expect(kept.map((e) => e.key)).toContain('own:a');
    expect(kept.map((e) => e.key)).not.toContain('own:b');
    expect(kept.filter((e) => e.origin === 'shipped')).toHaveLength(
      CLASSICS.filter((c) => c.vegetarian).length,
    );
  });

  const first = all[0];
  if (first === undefined) throw new Error('no entries');

  test('choices combine, and the query is a trimmed, case-insensitive part of the name', () => {
    const kept = all.filter((e) => matchesFilter(e, { character: 'tomatoey', origin: 'own' }));
    expect(kept.map((e) => e.key)).toEqual(['own:a']);
    expect(matchesQuery(first, '  DISH a ')).toBe(true);
    expect(matchesQuery(first, 'zzz')).toBe(false);
  });

  test('what is offered: only values an entry has, in the given order', () => {
    const offered = offeredBy(all, {
      characters: ['creamy', 'tomatoey'],
      courses: ['soup', 'main'],
      cuisines: ['de', 'it', 'fr', 'es'],
    });
    expect(offered.origins).toEqual(['own', 'shipped']);
    // The four asked for come first in their order; the nine other cuisines of the shipped dishes follow.
    expect(offered.cuisines.slice(0, 4)).toEqual(['de', 'it', 'fr', 'es']);
    expect([...offered.cuisines].sort()).toEqual([...COUNTRY_CODES].sort());
    expect(offered.courses.slice(0, 2)).toEqual(['soup', 'main']);
    expect(offered.characters.indexOf('creamy')).toBeLessThan(
      offered.characters.indexOf('tomatoey'),
    );
  });

  test('the stored filter: what does not fit is left out, and a store that throws gives the empty filter', () => {
    expect(
      parseDishFilter('{"origin":"x","course":"soup","meatFree":1,"completeOnly":true}'),
    ).toEqual({
      course: 'soup',
      completeOnly: true,
    });
    expect(parseDishFilter('not json')).toEqual({});
    const kept = new Map<string, string>();
    const store = {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => void kept.set(k, v),
    };
    expect(writeDishFilter(store, { character: 'creamy', meatFree: true })).toBe(true);
    expect(readDishFilter(store)).toEqual({ character: 'creamy', meatFree: true });
    expect(writeDishFilter(null, {})).toBe(false);
    expect(
      readDishFilter({
        getItem: () => {
          throw new Error('no storage');
        },
        setItem: () => undefined,
      }),
    ).toEqual({});
  });
});
