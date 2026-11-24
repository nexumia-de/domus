// One view model for a dish as shown, whatever its origin (docs/behaviour.md, "One dish screen for
// both origins"): built from every shipped classic through `deriveClassic`, and from a dish of a
// notebook built here in memory. Not proved here: the drawing (e2e/classics.mjs, dish-cook.mjs,
// dish-swap.mjs), and the running app's lookup, which reads the notebook before the catalogue.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { pickText } from '@culina/engine';
import type { Classic, Technique } from '@culina/engine';
import { dishesLike, likeInput } from '../src/browse/alike';
import { entryOfClassic, entryOfDish } from '../src/browse/entry';
import { cookView } from '../src/classics/cook-view';
import { dishView } from '../src/classics/dish-view';
import type { Lookup } from '../src/classics/nutrition-view';
import { dishCookView } from '../src/components/steps-view';
import { dishRaw } from '../src/dishes/raw';
import { shownOfClassic, shownOfDish, type ShownContext } from '../src/dishes/shown';
import { slotRows } from '../src/dishes/slots';
import { buildNotebook } from '../src/notebook/build';
import type { ComponentRecord, DishRecord, IngredientRecord } from '../src/records';
import { CLASSIC_DIR, jsonFiles } from './content-texts';
import { displayName } from '../src/shared/names';

const catalogue = JSON.parse(
  readFileSync(new URL('../data/ingredient-catalogue.json', import.meta.url), 'utf8'),
) as { ingredients: IngredientRecord[] };
const byId = new Map(catalogue.ingredients.map((r) => [r.id, r]));
const lookup: Lookup = (id) => byId.get(id);
// The name as shown: the kitchen name where the catalogue has one ("Ground beef, 80% lean").
const nameOf = (id: string): string => {
  const record = byId.get(id);
  return record === undefined ? id : displayName(record, 'en');
};

const technique = (id: string, en: string): Technique => ({
  id,
  name: { en, de: en },
  watch: { en: `Watch ${en}.`, de: `Achte auf ${en}.` },
  why: { en: 'Because.', de: 'Darum.' },
  level: 'textbook',
  sources: [{ title: 'A book', place: 'p. 1', isbn: '9780000000002', sentence: 'It is so.' }],
});
const KNOWN = [technique('pan-fry', 'Pan-frying'), technique('boil', 'Boiling')];
const ctx: ShownContext = { lang: 'en', nameOf, lookup, known: KNOWN, learned: new Set() };

const SHIPPED: Classic[] = jsonFiles(CLASSIC_DIR).map(
  (file) => JSON.parse(readFileSync(file, 'utf8')) as Classic,
);

describe('a shipped classic as shown', () => {
  test('the shipped files are all there', () => {
    expect(SHIPPED.length).toBeGreaterThanOrEqual(48);
  });

  test.each(SHIPPED.map((c) => [c.id, c] as const))('%s', (_, classic) => {
    for (const portions of [2, 5]) {
      const shown = shownOfClassic(classic, portions, ctx);
      if (!shown.ok) throw new Error(shown.code);
      const { dish } = shown;
      const view = dishView(classic, portions, 'en', nameOf);
      const steps = cookView(classic, portions, 'en', nameOf, KNOWN, new Set());
      const entry = entryOfClassic(classic, lookup, 'en');
      if (!view.ok || !steps.ok) throw new Error('view');
      expect(dish.origin).toBe('shipped');
      expect(dish.name).toBe(pickText(classic.name, 'en'));
      expect(dish.originalName).toBe(classic.originalName);
      // The quiet line: the course, the country as cuisine, and the meat flag set by hand.
      expect(dish.course).toBe(classic.course);
      expect(dish.cuisine).toBe(classic.country);
      expect(dish.meatFree).toBe(classic.vegetarian);
      // The characters as on the list, without the meat pair the quiet line says.
      expect(dish.characters).toEqual(
        entry.characters.filter((c) => c !== 'with-meat' && c !== 'with-fish'),
      );
      // Amounts for the portions: the engine's, as the classics' own view writes them.
      expect(dish.portions).toBe(portions);
      expect(dish.components).toEqual(view.view.components);
      expect(dish.slots).toEqual(view.view.slots);
      expect(dish.steps).toEqual(steps.steps);
      expect(dish.source?.source).toEqual(classic.source);
      expect(dish.nutrition.ok).toBe(true);
      expect(dish.fillings).toBeUndefined();
      expect(dish.note).toBeUndefined();
    }
  });

  test('portions that are not above zero give the engine’s code', () => {
    const first = SHIPPED[0] as Classic;
    expect(shownOfClassic(first, 0, ctx)).toEqual({ ok: false, code: 'invalid-portions' });
  });
});

// A notebook in memory with catalogue ingredients, so that the nutrition has figures.
const BEEF = 'fdc-174036';
const ONION = 'fdc-170000';
const POTATO = 'fdc-170028';
const MAYO = 'fdc-168094';
const ing = (id: string) => ({ kind: 'ingredient' as const, id });
const comp = (id: string) => ({ kind: 'component' as const, id });
const PATTY: ComponentRecord = {
  id: 'u-patty',
  name: 'Patties',
  lines: [
    { key: 'l1', ref: ing(BEEF), amount: { value: 500, unit: 'g' } },
    { key: 'l2', ref: ing(ONION), amount: { value: 100, unit: 'g' }, note: 'chopped fine' },
  ],
  steps: [
    { action: 'mix', uses: ['l1', 'l2'] },
    { technique: 'pan-fry', uses: ['l1'], time: { value: 8, unit: 'min' } },
  ],
  // An output weight, so that the dish can expand the component for its total (made-up figure).
  yield: { amount: { value: 600, unit: 'g' }, source: 'user' },
  version: { family: 'u-patty', date: '2026-11-20' },
};
const MASH: ComponentRecord = {
  id: 'u-mash',
  name: 'Mash',
  lines: [{ key: 'l1', ref: ing(POTATO), amount: { value: 800, unit: 'g' } }],
  steps: [{ technique: 'boil', uses: ['l1'] }],
  yield: { amount: { value: 800, unit: 'g' }, source: 'user' },
  version: { family: 'u-mash', date: '2026-11-20' },
};
const nb = buildNotebook(
  [BEEF, ONION, POTATO, MAYO].map((id) => byId.get(id) as IngredientRecord),
  [PATTY, MASH],
);
const PLATE: DishRecord = {
  id: 'u-plate',
  name: 'Patties with mash',
  note: 'Example',
  portions: 2,
  slots: [
    { key: 's1', role: 'main', ref: comp('u-patty'), amount: { value: 150, unit: 'g' } },
    { key: 's2', role: 'starch', ref: comp('u-mash'), amount: { value: 200, unit: 'g' } },
    { role: 'sauce', ref: ing(MAYO), amount: { value: 20, unit: 'g' }, optional: true },
  ],
  steps: [{ action: 'serve', uses: ['s1', 's2'] }],
  version: { family: 'u-plate', date: '2026-11-20' },
};
const options = { fromStock: (name: string): string => `From stock: ${name}` };

describe('a dish of the notebook as shown', () => {
  const dish = shownOfDish(nb, PLATE, 2, ctx, options);

  test('has the fields of a shipped dish, from the notebook', () => {
    expect(dish.origin).toBe('own');
    expect(dish.name).toBe('Patties with mash');
    expect(dish.originalName).toBeUndefined();
    expect(dish.note).toBe('Example');
    expect(dish.portions).toBe(2);
    expect(dish.source).toBeUndefined();
    const entry = entryOfDish(nb, PLATE, lookup);
    expect(dish.meatFree).toBe(entry.meatFree);
    expect(dish.characters).toEqual(
      entry.characters.filter((c) => c !== 'with-meat' && c !== 'with-fish'),
    );
  });

  test('a component is a group of lines with what the dish needs of it', () => {
    // 2 x 150 g of patties out of a run of 600 g: half of every line.
    expect(dish.components.map((c) => c.name)).toEqual(['Patties', 'Mash']);
    expect(dish.components[0]?.lines.map((l) => [l.name, l.amount, l.note])).toEqual([
      [nameOf(BEEF), '250 g', undefined],
      [nameOf(ONION), '50 g', 'chopped fine'],
    ]);
    expect(dish.components[1]?.lines.map((l) => l.amount)).toEqual(['400 g']);
    // The dish's own lines: the slots with their totals; the sauce is optional.
    expect(dish.slots.map((l) => [l.name, l.amount, l.optional])).toEqual([
      ['Patties', '300 g', false],
      ['Mash', '400 g', false],
      [nameOf(MAYO), '40 g', true],
    ]);
  });

  test('the amounts follow the portions', () => {
    const four = shownOfDish(nb, PLATE, 4, ctx, options);
    expect(four.components[0]?.lines.map((l) => l.amount)).toEqual(['500 g', '100 g']);
    expect(four.slots.map((l) => l.amount)).toEqual(['600 g', '800 g', '80 g']);
  });

  test('the steps are the ones the cook screen cooks, and the method lists them in one line', () => {
    expect(dish.steps).toEqual(dishCookView(nb, PLATE, 2, 'en', KNOWN, new Set(), options));
    expect(dish.steps.map((s) => s.component)).toEqual([
      'Patties',
      'Patties',
      'Mash',
      'Patties with mash',
    ]);
    expect(dish.steps[3]?.listed).toBe('Serve: Patties, Mash');
    const ready = shownOfDish(nb, PLATE, 2, ctx, { ...options, ready: (id) => id === 'u-mash' });
    expect(ready.steps.map((s) => s.text)).toContain('From stock: Mash');
    // A ready component still lists its ingredients; only its steps are left out.
    expect(ready.components.map((c) => c.name)).toEqual(['Patties', 'Mash']);
  });

  test('the role slots and the raw ingredients are those of the slot table', () => {
    expect(dish.fillings?.rows).toEqual(slotRows(nb, PLATE, 2));
    expect(dish.fillings?.raw).toEqual(dishRaw(nb, slotRows(nb, PLATE, 2)));
  });

  test('nutrition per portion counts the raw ingredients, not the optional slot', () => {
    if (!dish.nutrition.ok) throw new Error(dish.nutrition.code);
    const { view } = dish.nutrition;
    expect(view.portions).toBe(2);
    expect(view.tooFew).toBe(false);
    expect(view.coverage).toBe('Counted 3 of 4 ingredients.');
    expect(view.notCounted).toContain(nameOf(MAYO));
    expect(view.rows.map((r) => r.key).slice(0, 4)).toEqual([
      'energy',
      'protein',
      'fat',
      'carbohydrate',
    ]);
    // Twice the portions, twice the amounts: the same figures per portion.
    const four = shownOfDish(nb, PLATE, 4, ctx, options).nutrition;
    if (!four.ok) throw new Error(four.code);
    expect(four.view.rows).toEqual(view.rows);
  });

  test('course and cuisine are read where a dish has them, and left out where not', () => {
    expect(dish.course).toBeUndefined();
    expect(dish.cuisine).toBeUndefined();
    const stated = { ...PLATE, course: 'main', cuisine: 'it' } as DishRecord;
    const shown = shownOfDish(nb, stated, 2, ctx, options);
    expect([shown.course, shown.cuisine]).toEqual(['main', 'it']);
    const odd = { ...PLATE, course: 3 } as unknown as DishRecord;
    expect(shownOfDish(nb, odd, 2, ctx, options).course).toBeUndefined();
  });

  test('a course word the app does not know is shown, and "like" reads the course of the lists', () => {
    // The page shows "Hauptgang" as written; the lists keep only the courses they know, so for
    // them the dish has no course and is compared with every course. Before 2026-11-24's review
    // the page compared with "Hauptgang" and found nothing.
    const written = { ...PLATE, course: 'Hauptgang' } as unknown as DishRecord;
    const shown = shownOfDish(nb, written, 2, ctx, options);
    expect(shown.course).toBe('Hauptgang');
    expect(shown.entry.course).toBeUndefined();
    const main = { key: 'shipped:m', characters: ['cheesy', 'baked'], course: 'main' };
    const mine = { ...likeInput(shown.entry, 'own:u-plate'), characters: ['cheesy', 'baked'] };
    expect(dishesLike(mine, [main]).map((a) => a.entry.key)).toEqual(['shipped:m']);
    // Control: with the word of the page as its course, nothing would be found.
    expect(dishesLike({ ...mine, course: shown.course }, [main])).toEqual([]);
  });

  test('a filling that cannot be added up is named as not counted, the rest still is', () => {
    const lost: DishRecord = {
      ...PLATE,
      slots: [
        ...PLATE.slots,
        { role: 'garnish', ref: comp('u-gone'), amount: { value: 5, unit: 'g' } },
      ],
    };
    const shown = shownOfDish(nb, lost, 2, ctx, options);
    if (!shown.nutrition.ok) throw new Error(shown.nutrition.code);
    expect(shown.nutrition.view.coverage).toBe('Counted 3 of 5 ingredients.');
  });
});
