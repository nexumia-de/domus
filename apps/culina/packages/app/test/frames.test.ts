// The frames (data/frames/<id>.json): the project's own compositions of shipped recipes, composed
// into bases by compose-frames.mjs. On the real frames and recipes, and on small invented ones for
// the rules. Not proved: that the parts of a frame go together on a plate; nobody cooked one.
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import {
  TECHNIQUES,
  chooseAlternative,
  componentsInDish,
  copyClassic,
  slotAlternatives,
  validateClassic,
  withoutAlternatives,
} from '@culina/engine';
import type { Classic } from '@culina/engine';
import { composeFrame, composeFrames } from '../compose-frames.mjs';
import type { FrameFile } from '../compose-frames.mjs';
import {
  asChosen,
  chooseFilling,
  fillingChoices,
  resetChoices,
  withChoices,
} from '../src/classics/choices';
import { CLASSICS, FRAMES } from '../src/classics/index';
import { dishView } from '../src/classics/dish-view';
import { must } from './must';

const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const schema = (name: string): object => read(`../../engine/schemas/${name}.schema.json`) as object;
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addSchema(schema('common'));
const classicSchema = ajv.compile(schema('classic'));
const catalogueIds = new Set(
  (read('../data/ingredient-catalogue.json') as { ingredients: { id: string }[] }).ingredients.map(
    (i) => i.id,
  ),
);
const recipes = new Map(CLASSICS.map((c) => [c.id, c]));
const frame = (id: string): Classic => must(FRAMES.find((f) => f.id === id));

describe('the shipped frames', () => {
  test('there are eleven, each a base marked as a frame, with an id no recipe has', () => {
    expect(FRAMES.map((f) => f.id)).toEqual([
      'burger-plate',
      'burrito',
      'chana-masala-plate',
      'fried-egg-rice-plate',
      'kofte-plate',
      'miso-ramen',
      'pizza-margherita',
      'risotto',
      'souvlaki-plate',
      'tacos',
      'teishoku',
    ]);
    for (const f of FRAMES) {
      expect(f.kind, f.id).toBe('base');
      expect(f.frame, f.id).toBe(true);
      expect(recipes.has(f.id), f.id).toBe(false);
      expect(f.source, f.id).toEqual({ own: true, year: 2026 });
    }
  });

  test('every frame meets the schema and the rules of a dish file', () => {
    for (const f of FRAMES) {
      expect(classicSchema(f), `${f.id}: ${JSON.stringify(classicSchema.errors)}`).toBe(true);
      const result = validateClassic(f, { techniques: TECHNIQUES, ingredientIds: catalogueIds });
      expect(result, `${f.id}: ${JSON.stringify(result)}`).toEqual({ ok: true });
    }
  });

  test('every component says which recipe it is, with that recipe as it is shipped', () => {
    for (const f of FRAMES) {
      for (const c of f.components ?? []) {
        const from = must(c.from);
        const recipe = must(recipes.get(from.recipe));
        expect(from.name, `${f.id}/${c.id}`).toEqual(recipe.name);
        expect(from.source, `${f.id}/${c.id}`).toEqual(recipe.source);
        expect(c.name).toEqual(recipe.name);
        expect(c.steps).toEqual(must(recipe.components?.[0]).steps);
      }
    }
  });

  test('tacos: the chicken fills the slot, the beans are its alternative', () => {
    const tacos = frame('tacos');
    const main = must(tacos.slots.find((s) => s.role === 'main'));
    expect(main.ref).toEqual({ kind: 'component', id: 'pollo-deshebrado-en-jitomate-main' });
    expect(slotAlternatives(tacos, main).map((c) => c.from?.recipe)).toEqual(['frijoles-refritos']);
    // Control: a slot with one part has no alternative.
    const acid = must(tacos.slots.find((s) => s.role === 'acid'));
    expect(slotAlternatives(tacos, acid)).toEqual([]);
  });

  test('as it is cooked, a frame is without its alternatives: the screens see the chicken, not the beans', () => {
    const tacos = frame('tacos');
    const cooked = withoutAlternatives(tacos);
    const ids = (c: Classic): string[] => (c.components ?? []).map((k) => must(k.from).recipe);
    expect(ids(tacos)).toContain('frijoles-refritos');
    expect(ids(cooked)).toEqual([
      'tortillas-de-harina',
      'pollo-deshebrado-en-jitomate',
      'guacamole',
      'pico-de-gallo',
    ]);
    expect(
      validateClassic(cooked, { techniques: TECHNIQUES, ingredientIds: catalogueIds }),
    ).toEqual({ ok: true });
    const shown = dishView(cooked, 4, 'en', (id) => id);
    expect(shown.ok && shown.view.components.map((c) => c.name)).not.toContain(
      'Refried pinto beans',
    );
    // Control: a recipe, and a frame without alternatives, are returned as they are.
    expect(withoutAlternatives(frame('pizza-margherita'))).toBe(frame('pizza-margherita'));
    const recipe = must(recipes.get('guacamole'));
    expect(withoutAlternatives(recipe)).toBe(recipe);
  });

  test('choosing the beans puts them into the dish and makes the chicken the alternative', () => {
    const tacos = frame('tacos');
    const at = tacos.slots.findIndex((s) => s.role === 'main');
    const chosen = chooseAlternative(tacos, at, 'frijoles-refritos-main');
    expect(chosen.slots[at]?.ref).toEqual({ kind: 'component', id: 'frijoles-refritos-main' });
    expect(slotAlternatives(chosen, must(chosen.slots[at])).map((c) => c.from?.recipe)).toEqual([
      'pollo-deshebrado-en-jitomate',
    ]);
    expect(
      (withoutAlternatives(chosen).components ?? []).map((c) => must(c.from).recipe),
    ).toContain('frijoles-refritos');
    // The tortillas are made with lard: the tacos are not vegetarian with the beans either.
    expect(chosen.vegetarian).toBe(false);
    // Controls: an id that is no alternative of the slot, and a slot that does not exist, change nothing.
    expect(chooseAlternative(tacos, at, 'guacamole-sauce')).toBe(tacos);
    expect(chooseAlternative(tacos, 99, 'frijoles-refritos-main')).toBe(tacos);
  });

  test('the set meal says "without meat and fish" once the omelette takes the salmon place', () => {
    const meal = frame('teishoku');
    expect(meal.vegetarian).toBe(false);
    const at = meal.slots.findIndex((s) => s.role === 'main');
    const omelette = must(slotAlternatives(meal, must(meal.slots[at]))[0]);
    expect(omelette.from?.recipe).toBe('tamagoyaki');
    expect(chooseAlternative(meal, at, omelette.id).vegetarian).toBe(true);
  });

  test('the cook choice: the screens show it, Keep copies the base with it and the alternatives', () => {
    resetChoices();
    const tacos = frame('tacos');
    const at = tacos.slots.findIndex((s) => s.role === 'main');
    expect(fillingChoices(tacos, 'en').map((c) => [c.role, c.options.length])).toEqual([
      ['main', 2],
      ['sauce', 2],
    ]);
    chooseFilling('tacos', at, 'frijoles-refritos-main');
    expect(must(fillingChoices(tacos, 'en')[0]).current).toBe('frijoles-refritos-main');
    expect((asChosen(tacos).components ?? []).map((c) => c.id)).not.toContain(
      'pollo-deshebrado-en-jitomate-main',
    );
    expect((withChoices(tacos).components ?? []).length).toBe((tacos.components ?? []).length);
    resetChoices();
    // Control: without a choice the frame is as shipped.
    expect(withChoices(tacos)).toBe(tacos);
  });

  test('the pizza has slots filled by plain ingredients', () => {
    const pizza = frame('pizza-margherita');
    expect(pizza.slots.map((s) => [s.role, s.ref?.kind])).toEqual([
      ['starch', 'component'],
      ['sauce', 'ingredient'],
      ['main', 'ingredient'],
      ['garnish', 'ingredient'],
    ]);
  });

  test('a frame can be kept: every part becomes a component with the origin of its recipe', () => {
    for (const f of FRAMES) {
      let n = 0;
      const kept = copyClassic(f, { lang: 'en', date: '2026-11-24', newId: () => `u-${++n}` });
      expect(kept.ok, f.id).toBe(true);
      if (!kept.ok) continue;
      expect(kept.dish['x-origin']).toEqual({ classic: f.id, own: true, year: 2026 });
      expect(kept.components.map((c) => c['x-origin'].classic).sort()).toEqual(
        (f.components ?? []).map((c) => must(c.from).recipe).sort(),
      );
    }
  });

  test('the dish view lists the parts with their sources; a recipe has no such list', () => {
    const shown = dishView(frame('tacos'), 4, 'en', (id) => id);
    expect(shown.ok).toBe(true);
    if (!shown.ok) return;
    // Every recipe the frame can be made of is named, the alternatives too.
    expect(shown.view.frameParts?.map((p) => p.recipe)).toEqual([
      'tortillas-de-harina',
      'pollo-deshebrado-en-jitomate',
      'frijoles-refritos',
      'guacamole',
      'crema-de-limon',
      'pico-de-gallo',
    ]);
    const recipe = dishView(must(recipes.get('guacamole')), 4, 'en', (id) => id);
    expect(recipe.ok && recipe.view.frameParts).toBeUndefined();
  });
});

describe('composing', () => {
  const own = (id: string, persons: number, grams: number): Classic =>
    ({
      id,
      kind: 'base',
      name: { en: id, de: id },
      originalName: id,
      country: 'de',
      vegetarian: true,
      course: 'side',
      source: { own: true, year: 2026 },
      persons: { value: persons, basis: 'stated' },
      components: [
        {
          id: `${id}-part`,
          name: { en: 'part', de: 'Teil' },
          role: 'starch',
          lines: [
            {
              key: 'a',
              ref: { kind: 'ingredient', id: 'fdc-173468' },
              amount: { value: grams, unit: 'g' },
            },
            { key: 'b', ref: { kind: 'ingredient', id: 'fdc-173647' } },
          ],
        },
      ],
      slots: [{ role: 'starch', ref: { kind: 'component', id: `${id}-part` } }],
      settled: [],
      check: { method: 'second-reader', note: 'n' },
    }) as Classic;
  const file = (slots: FrameFile['slots'], persons = 4): FrameFile => ({
    id: 'plate',
    name: { en: 'Plate', de: 'Teller' },
    originalName: 'Plate',
    country: 'de',
    course: 'main',
    persons,
    year: 2026,
    slots,
  });
  const book = (...list: Classic[]): Map<string, unknown> => new Map(list.map((c) => [c.id, c]));

  test('amounts are scaled from the recipe persons to the frame persons; a line without amount stays', () => {
    const composed = composeFrame(
      file([{ role: 'main', parts: ['rice'] }], 6),
      book(own('rice', 4, 300)),
    );
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const lines = must((composed.classic as Classic).components?.[0]).lines;
    expect(lines[0]?.amount).toEqual({ value: 450, unit: 'g' });
    expect(lines[1]?.amount).toBeUndefined();
  });

  test('control: the same persons leave the amounts as they are, and the part takes the slot role', () => {
    const composed = composeFrame(
      file([{ role: 'main', parts: ['rice'] }]),
      book(own('rice', 4, 300)),
    );
    if (!composed.ok) throw new Error('not composed');
    const part = must((composed.classic as Classic).components?.[0]);
    expect(part.lines[0]?.amount).toEqual({ value: 300, unit: 'g' });
    expect(part.role).toBe('main');
  });

  test('the first recipe of a slot fills it; a second is its alternative by the rule of a base', () => {
    const composed = composeFrame(
      file([{ role: 'main', parts: ['rice', 'bread'] }]),
      book(own('rice', 4, 300), own('bread', 4, 200)),
    );
    if (!composed.ok) throw new Error('not composed');
    const plate = composed.classic as Classic;
    const main = must(plate.slots[0]);
    expect(main.ref).toEqual({ kind: 'component', id: 'rice-part' });
    expect(slotAlternatives(plate, main).map((c) => c.from?.recipe)).toEqual(['bread']);
    expect(componentsInDish(plate).has('bread-part')).toBe(false);
    expect(validateClassic(plate, { techniques: TECHNIQUES })).toEqual({ ok: true });
  });

  test('what cannot be a part is named: unknown, cited, more than one component, named twice', () => {
    const cited = {
      ...own('old', 4, 1),
      source: { author: 'A', title: 'T', year: 1900, place: 'P', url: 'https://example.org' },
    } as Classic;
    const two = own('two', 4, 1);
    const twoParts = {
      ...two,
      components: [...(two.components ?? []), { ...must(two.components?.[0]), id: 'x' }],
    } as Classic;
    const composed = composeFrame(
      file([{ role: 'main', parts: ['gone', 'old', 'two', 'rice', 'rice'] }, { role: 'side' }]),
      book(cited, twoParts, own('rice', 4, 1)),
    );
    expect(composed).toEqual({
      ok: false,
      problems: [
        'slots[0]: no shipped recipe gone',
        'slots[0]: old follows a source; a frame takes own recipes',
        'slots[0]: two is not one component in one slot',
        'slots[0]: rice is named twice',
        'slots[1]: names neither parts nor an ingredient',
      ],
    });
  });

  test('a frame whose id a recipe has stops the build', () => {
    const rice = own('plate', 4, 1);
    expect(() => composeFrames([file([{ role: 'main', parts: ['plate'] }])], [rice])).toThrow(
      /plate: a shipped recipe has this id/,
    );
  });
});
