// The view logic of the nutrition section, without a DOM: the engine derives and rounds, the view
// picks the words. Fictional example dishes; the figures are the shipped catalogue's.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { deriveClassic, dishNutrition, roundNutrition } from '@culina/engine';
import type { Classic } from '@culina/engine';
import { nutritionView, type Lookup } from '../src/classics/nutrition-view';
import type { IngredientRecord } from '../src/records';
import { strings } from '../src/strings';
import { FORBIDDEN } from './wording';
import { NAMES, PAN_DISH, SECOND_DISH } from './classics-fixture';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: IngredientRecord[] };
const byId = new Map(file.ingredients.map((r) => [r.id, r]));
const lookup: Lookup = (id) => byId.get(id);

const view = (classic: Classic, portions: number, find: Lookup = lookup) => {
  const result = nutritionView(classic, portions, 'en', NAMES, find);
  if (!result.ok) throw new Error(result.code);
  return result.view;
};

describe('the figures', () => {
  test('are the engine’s per portion, rounded by the engine, in a fixed order', () => {
    const shown = view(PAN_DISH, 2);
    const derived = deriveClassic(PAN_DISH, { portions: 2, lang: 'en' });
    if (!derived.ok) throw new Error('derive');
    const facts = Object.fromEntries(
      file.ingredients.flatMap((r) => [
        [
          r.id,
          {
            ...(r.densityGPerMl === undefined ? {} : { densityGPerMl: r.densityGPerMl.value }),
            ...(r.unitWeightG === undefined ? {} : { unitWeightG: r.unitWeightG.value }),
          },
        ],
      ]),
    );
    const nutrition = Object.fromEntries(
      file.ingredients.flatMap((r) =>
        r['x-nutrition'] === undefined ? [] : [[r.id, r['x-nutrition'].per100g]],
      ),
    );
    const engine = dishNutrition(derived, { facts, nutrition });
    if (!engine.ok) throw new Error('engine');
    expect(shown.rows.map((r) => r.key)).toEqual([
      'energy',
      'protein',
      'fat',
      'carbohydrate',
      'fibre',
      'salt',
    ]);
    const r = roundNutrition(engine.perPortion);
    if (!r.ok) throw new Error('round');
    expect(shown.rows[0]?.value).toBe(`${r.rounded.kcal} kcal / ${r.rounded.kJ} kJ`);
    expect(shown.rows[2]?.value).toBe(`${r.rounded.fatG} g`);
    expect(shown.none).toBe(false);
  });
  test('are per portion, so they do not depend on how many portions the dish is made for', () => {
    expect(view(PAN_DISH, 4).rows).toEqual(view(PAN_DISH, 2).rows);
    expect(view(PAN_DISH, 4).portions).toBe(4);
    expect(view(PAN_DISH, 1).coverage).toBe(view(PAN_DISH, 2).coverage);
  });
});

describe('the coverage', () => {
  test('says how many ingredients were counted and which were not, with the reason', () => {
    const shown = view(PAN_DISH, 2);
    expect(shown.coverage).toBe('Counted 2 of 3 ingredients.');
    expect(shown.notCounted).toBe('Not counted: name of fdc-173468 (no amount).');
  });
  test('a line not in the catalogue yet is named by its own words', () => {
    const shown = view(SECOND_DISH, 2);
    expect(shown.coverage).toBe('Counted 1 of 2 ingredients.');
    expect(shown.notCounted).toContain('Example broth stock (no catalogue entry)');
  });
  test('a catalogue entry without nutrient data is left out with that reason', () => {
    const bare: Lookup = (id) => {
      const r = byId.get(id);
      if (id !== 'fdc-173410' || r === undefined) return r;
      const rest: IngredientRecord = { ...r };
      delete rest['x-nutrition'];
      return rest;
    };
    const shown = view(PAN_DISH, 2, bare);
    expect(shown.coverage).toBe('Counted 1 of 3 ingredients.');
    expect(shown.notCounted).toContain('name of fdc-173410 (no nutrient data)');
  });
  test('too few counted (none, one, or under a quarter): one short line instead of figures', () => {
    // One of three is counted: the engine's figures exist, but they stand for one ingredient only.
    const one: Lookup = (id) => (id === 'fdc-173410' ? byId.get(id) : undefined);
    const few = view(PAN_DISH, 2, one);
    expect(few.tooFew).toBe(true);
    expect(few.rows).toEqual([]);
    expect(few.notShown).toEqual([]);
    expect(few.notCounted).toContain('(');
    expect(view(PAN_DISH, 2).tooFew).toBe(false);
    expect(view(PAN_DISH, 2).rows.length).toBeGreaterThan(0);
    expect(strings.nutrition.tooFew).toBe(
      'Nutrition cannot be worked out: too few ingredients have an amount and nutrient data.',
    );
  });
  test('nothing counted: no rows and no figures', () => {
    const none = view(PAN_DISH, 2, () => undefined);
    expect(none.none).toBe(true);
    expect(none.tooFew).toBe(true);
    expect(none.rows).toEqual([]);
    expect(none.coverage).toBe('Counted 0 of 3 ingredients.');
  });
  test('a figure an ingredient lacks is not shown and says so', () => {
    const noFibre: Lookup = (id) => {
      const r = byId.get(id);
      const n = r?.['x-nutrition'];
      if (id !== 'fdc-173410' || r === undefined || n === undefined) return r;
      const per100g = { ...n.per100g };
      delete per100g.fibreG;
      return { ...r, 'x-nutrition': { per100g } };
    };
    const shown = view(PAN_DISH, 2, noFibre);
    expect(shown.rows.map((r) => r.key)).not.toContain('fibre');
    expect(shown.notShown).toEqual([strings.nutrition.fibreNotShown]);
  });
  test('a variety without its own density takes its parent’s, so a volume line still counts', () => {
    const child: IngredientRecord = {
      id: 'test-child',
      name: 'Child',
      parentId: 'test-parent',
      'x-nutrition': { per100g: { kcal: 100, kJ: 418, proteinG: 1, fatG: 1, carbohydrateG: 1 } },
    };
    const parent: IngredientRecord = {
      id: 'test-parent',
      name: 'Parent',
      densityGPerMl: { value: 1, source: 'test' },
    };
    const classic: Classic = {
      ...PAN_DISH,
      components: [],
      slots: [
        {
          role: 'liquid',
          ref: { kind: 'ingredient', id: 'test-child' },
          amount: { value: 100, unit: 'ml' },
        },
      ],
    } as Classic;
    const shown = view(classic, 4, (id) => ({ 'test-child': child, 'test-parent': parent })[id]);
    expect(shown.coverage).toBe(
      'Counted all 1 ingredient.'.replace('all 1 ingredient', 'the 1 ingredient'),
    );
  });
});

describe('the wording', () => {
  test('never judges: no verdict word, no comparison with a daily value, no colour', () => {
    const texts = [
      ...Object.values(strings.nutrition).flatMap((v) =>
        typeof v === 'string' ? [v] : typeof v === 'object' ? Object.values(v) : [],
      ),
      ...Object.values(view(PAN_DISH, 2)).filter((v): v is string => typeof v === 'string'),
    ];
    for (const text of texts) {
      expect(text.match(FORBIDDEN), text).toBeNull();
      expect(text, text).not.toMatch(
        /\b(healthy|unhealthy|high|low|good|great|light|heavy|daily|recommended|reference intake|% of)\b/i,
      );
    }
  });
});
