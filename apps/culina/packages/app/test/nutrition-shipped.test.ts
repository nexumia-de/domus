// The nutrition section of all 48 shipped dishes, as the screen gets it: per dish whether figures
// are shown, the energy per portion when they are, and how many lines are counted. Pins the rule of
// docs/engine-rules.md (Nutrition, When figures are shown; The figures of a line) on the real
// content and the shipped catalogue. A change to a dish, the catalogue or the rule shows up here
// and is looked at, not waved through. Not proved: that the figures are right for a cooked dish
// (raw figures, no frying fat absorbed, no losses; see docs/nutrition-evaluation.md).
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { Classic } from '@culina/engine';
import { nutritionView, type Lookup } from '../src/classics/nutrition-view';
import type { IngredientRecord } from '../src/records';
import { CLASSIC_DIR, jsonFiles } from './content-texts';

const file = JSON.parse(
  readFileSync(new URL('../data/ingredient-catalogue.json', import.meta.url), 'utf8'),
) as { ingredients: IngredientRecord[] };
const byId = new Map(file.ingredients.map((r) => [r.id, r]));
const lookup: Lookup = (id) => byId.get(id);

const dishes = jsonFiles(CLASSIC_DIR).map((f) => JSON.parse(readFileSync(f, 'utf8')) as Classic);

const viewOf = (id: string) => {
  const classic = dishes.find((c) => c.id === id);
  if (classic === undefined) throw new Error(id);
  const result = nutritionView(
    classic,
    classic.persons.value,
    'en',
    (i) => byId.get(i)?.name ?? i,
    lookup,
  );
  if (!result.ok) throw new Error(`${id}: ${result.code}`);
  return result.view;
};

/** Per dish, for its own number of persons: kcal per portion (null: no figures), counted, lines. */
const EXPECTED: Record<string, [number | null, number, number]> = {
  'baked-potatoes-cheese': [null, 2, 5],
  'egg-noodles': [null, 2, 6],
  eierkuchen: [null, 3, 9],
  frikandelle: [null, 2, 10],
  'holl-sauce': [null, 2, 7],
  kartoffelkloesse: [null, 2, 6],
  'marinierte-heringe': [null, 1, 13],
  milchsuppe: [null, 4, 7],
  napfkuchen: [null, 4, 10],
  'potato-soup-fine': [null, 4, 9],
  'rote-gruetze': [null, 3, 5],
  sauerbraten: [null, 6, 17],
  alioli: [null, 2, 5],
  'arlequin-de-judias': [null, 1, 9],
  'cocido-ordinario': [null, 7, 11],
  'crema-de-chocolate': [null, 3, 5],
  'flan-clasico': [null, 7, 11],
  'gazpacho-andaluz': [null, 2, 7],
  'guisantes-al-natural': [null, 6, 11],
  'huevos-amerengados': [null, 5, 8],
  'potaje-espinacas-garbanzos': [null, 1, 7],
  'pure-de-patatas': [null, 3, 8],
  'sopa-de-leche': [null, 3, 7],
  'tortilla-de-patatas': [1280, 4, 5],
  'creme-caramel': [null, 3, 5],
  'gratin-dauphinois': [null, 4, 9],
  'haricots-verts-beurre': [130, 3, 7],
  mayonnaise: [2380, 4, 7],
  'oeufs-a-la-neige': [580, 8, 10],
  'omelette-fines-herbes': [520, 4, 5],
  'pommes-au-beurre': [null, 3, 4],
  'pot-au-feu': [null, 8, 11],
  'potage-pois-verts-maigre': [null, 6, 10],
  'poulet-bourguignonne': [null, 9, 15],
  'sauce-hollandaise': [240, 4, 8],
  'souffle-parmesan': [1440, 6, 9],
  'cavolfiore-balsamella': [null, 2, 9],
  'crema-cotta': [310, 3, 4],
  'fritto-di-finocchi': [null, 2, 10],
  'gnocchi-di-patate': [null, 2, 7],
  'latte-brule': [180, 5, 6],
  minestrone: [null, 3, 19],
  'pollo-alla-contadina': [null, 1, 10],
  'risotto-alla-milanese': [null, 3, 7],
  'salsa-di-pomodoro': [null, 3, 9],
  'stracotto-di-vitella': [null, 5, 15],
  'tagliatelle-verdi': [null, 1, 6],
  'torta-mantovana': [null, 6, 10],
};

describe('the nutrition of the shipped dishes', () => {
  test('every shipped dish is in the table and no other', () => {
    expect(dishes.map((c) => c.id).sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(dishes).toHaveLength(48);
  });

  for (const [id, [kcal, counted, total]] of Object.entries(EXPECTED)) {
    test(id, () => {
      const view = viewOf(id);
      expect(view.coverage).toBe(
        counted === total
          ? `Counted all ${total} ingredients.`
          : `Counted ${counted} of ${total} ingredients.`,
      );
      if (kcal === null) {
        expect(view.tooFew).toBe(true);
        expect(view.rows).toEqual([]);
        expect(view.why).toBeDefined();
      } else {
        expect(view.tooFew).toBe(false);
        expect(view.why).toBeUndefined();
        expect(view.rows[0]?.value).toMatch(new RegExp(`^${kcal} kcal / `));
      }
    });
  }

  test('9 of 48 dishes show figures (15 did before 2026-11-21)', () => {
    expect(dishes.filter((c) => !viewOf(c.id).tooFew)).toHaveLength(9);
  });
});

describe('checked by hand from the USDA figures', () => {
  test('the herb omelette: 3 eggs and 45 g butter a portion, about 520 kcal', () => {
    // Gouffé, for 2: 6 eggs, 90 g butter, 5 prises (1 g each) salt, 3 prises pepper, parsley
    // without amount. A portion: 3 x 44 g egg (FDC 171287, "1 medium" = 44 g), 45 g butter
    // without salt (FDC 173430), 2.5 g salt (FDC 173468), 1.5 g black pepper (FDC 170931).
    // kcal: 132 x 1.43 + 45 x 7.17 + 0 + 1.5 x 2.51 = 188.76 + 322.65 + 3.765 = 515.175 -> 520.
    // kJ: 790.68 + 1350 + 15.75 = 2156.43 -> 2160. Fat: 12.5532 + 36.495 + 0.0489 = 49.1 -> 49.
    // Protein: 16.632 + 0.3825 + 0.156 = 17.17 -> 17. Carbohydrate: 0.95 + 0.03 + 0.96 = 1.94 -> 2.
    // Sodium: 187.44 + 4.95 + 970 + 0.3 = 1162.69 mg; salt x 2.5 = 2906.7 mg -> 2910 mg = 2.91 g.
    const view = viewOf('omelette-fines-herbes');
    expect(view.rows.map((r) => [r.key, r.value])).toEqual([
      ['energy', '520 kcal / 2160 kJ'],
      ['protein', '17 g'],
      ['fat', '49 g'],
      ['carbohydrate', '2 g'],
      ['fibre', '0 g'],
      ['salt', '2.91 g'],
    ]);
    expect(view.asUsual).toBe(
      'Where the recipe names no kind, the usual one is counted: Egg, whole as Egg, whole, fresh, Butter as Butter, without salt.',
    );
    expect(view.notCounted).toBe('Not counted: Parsley, fresh (no amount).');
  });

  test('Artusi’s crema: 8 yolks, 200 g sugar, a litre of milk for 6, about 310 kcal', () => {
    // A portion: 8 x 17 g / 6 yolk (FDC 172184) = 22.67 g x 3.22 = 72.99 kcal; 33.33 g sugar
    // (FDC 169655) x 3.87 = 129.0; 1000 ml x 1.031 g/ml / 6 = 171.83 g milk (FDC 172217) x 0.61 =
    // 104.82. Sum 306.8 -> 310. The vanilla has no amount and is a seasoning.
    const view = viewOf('crema-cotta');
    expect(view.rows[0]?.value).toBe('310 kcal / 1290 kJ');
  });

  test('Eierkuchen: milk and eggs now count, but the frying butter and sugar have no amount', () => {
    const view = viewOf('eierkuchen');
    expect(view.why).toBe(
      'No figures are shown: Butter, Sugars cannot be counted, and a total without them would mislead.',
    );
    expect(view.notCounted).not.toContain('Milk');
  });
});
