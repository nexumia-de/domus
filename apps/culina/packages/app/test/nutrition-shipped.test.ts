// The nutrition section of all 124 shipped dishes, as the screen gets it: per dish whether figures
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
  kartoffelnudeln: [null, 1, 6],
  ruehrei: [null, 2, 4],
  'saure-eiersauce': [null, 2, 7],
  spargelsauce: [null, 3, 9],
  'weisse-mehlsuppe': [null, 1, 6],
  'arroz-blanco': [null, 1, 4],
  'salsa-de-tomate': [340, 3, 5],
  'salsa-vinagreta': [null, 1, 7],
  'sopa-de-cebolla': [null, 1, 8],
  'macaroni-a-l-italienne-maigre': [380, 7, 8],
  'oeufs-brouilles-au-fromage': [null, 6, 9],
  'pommes-de-terre-au-lait': [320, 5, 6],
  'sauce-blanche': [190, 5, 6],
  'sauce-maitre-d-hotel': [360, 4, 5],
  'soupe-aux-poireaux': [180, 8, 9],
  balsamella: [null, 1, 3],
  'gnocchi-di-semolino': [330, 5, 6],
  'maccheroni-alla-bolognese': [null, 5, 13],
  'passato-di-patate': [200, 3, 4],
  'spaghetti-alla-rustica': [null, 2, 8],
  achat: [70, 7, 8],
  'arroz-rojo': [350, 6, 7],
  'bai-mi-fan': [270, 1, 2],
  'barbecue-sauce': [120, 10, 11],
  'basmati-chawal': [270, 2, 3],
  bratkartoffeln: [270, 5, 5],
  'bulgur-pilavi': [350, 7, 8],
  'buttermilk-pancakes': [null, 7, 9],
  'chana-masala': [390, 16, 18],
  'chao-cai-jiang': [40, 6, 6],
  chapati: [260, 4, 5],
  'coban-salatasi': [140, 8, 8],
  coleslaw: [null, 6, 7],
  crepes: [430, 6, 6],
  'dan-chao-fan': [430, 7, 8],
  'fanqie-chao-dan': [220, 6, 6],
  'frijoles-refritos': [320, 6, 7],
  'gambas-al-ajillo': [280, 6, 6],
  gohan: [270, 1, 2],
  guacamole: [250, 6, 6],
  'hamburger-patties': [410, 4, 4],
  horiatiki: [310, 9, 9],
  'impasto-per-pizza': [520, 4, 5],
  kachumber: [30, 7, 7],
  'kaeng-phet-kai': [null, 9, 11],
  'khao-suai': [270, 1, 2],
  kofte: [440, 7, 7],
  'kyuri-no-sunomono': [40, 6, 7],
  ladolemono: [180, 5, 5],
  'macaroni-and-cheese': [800, 10, 11],
  'mashed-potatoes': [300, 6, 7],
  'masoor-dal-tadka': [310, 12, 13],
  'mercimek-corbasi': [330, 12, 13],
  'miso-shiru': [null, 3, 4],
  'murgh-masala': [350, 15, 16],
  'nam-chim-kai': [80, 6, 8],
  'nam-chim-satay': [260, 7, 8],
  'onion-gravy': [120, 6, 6],
  'pai-huanggua': [40, 7, 7],
  'patatas-bravas': [650, 11, 12],
  'patates-lemonates': [340, 7, 8],
  'pesto-genovese': [310, 7, 7],
  'pico-de-gallo': [35, 6, 6],
  'pollo-deshebrado-en-jitomate': [280, 10, 11],
  'quiche-lorraine': [830, 10, 11],
  rahmchampignons: [270, 7, 7],
  raita: [70, 5, 5],
  ratatouille: [250, 11, 11],
  'roast-potatoes': [290, 4, 5],
  'sake-no-shioyaki': [230, 3, 3],
  'souvlaki-kotopoulo': [300, 7, 7],
  tamagoyaki: [110, 6, 7],
  'teriyaki-no-tare': [60, 3, 3],
  'tortillas-de-harina': [null, 3, 5],
  tzatziki: [170, 7, 7],
  'vinaigrette-moutarde': [280, 6, 6],
};

describe('the nutrition of the shipped dishes', () => {
  test('every shipped dish is in the table and no other', () => {
    expect(dishes.map((c) => c.id).sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(dishes).toHaveLength(124);
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

  test('68 of 124 dishes show figures (17 of 68 before the own recipes of 2026-11-24)', () => {
    expect(dishes.filter((c) => !viewOf(c.id).tooFew)).toHaveLength(68);
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
