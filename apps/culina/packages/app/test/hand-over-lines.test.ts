// What a shipped dish lacks as lines for the shopping list (src/shared-list/lines.ts), on the real
// shipped files (frames composed by make-classics.mjs) and the real catalogue, with an empty
// notebook and no stock: the names and amounts as the list will hold them, in English and German.
// What this does not prove: no screen shows them (none exists yet), no stock is ticked here except
// where said, and the strings are the app's own (`stringsEn`, `stringsDe`) read without a reload.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { chooseAlternative } from '@culina/engine';
import type { Classic, Lang } from '@culina/engine';
import { resetCatalogue } from '../src/catalogue/load';
import { asChosen, fillingChoices, resetChoices } from '../src/classics/choices';
import { classicOf, loadContent, resetContent } from '../src/classics/content';
import { catalogueEntries, loadNames } from '../src/classics/names';
import type { CookSource } from '../src/cook/input';
import { reset } from '../src/notebook/state';
import { classicListLines, listAmountText } from '../src/shared-list/lines';
import { shippedContent } from '../make-classics.mjs';
import { must } from './must';

const catalogueFile = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as unknown;

beforeAll(async () => {
  reset();
  resetContent();
  resetCatalogue();
  const content = shippedContent();
  await loadContent(() => Promise.resolve({ ok: true, json: () => Promise.resolve(content) }));
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(catalogueFile) })),
  );
  await loadNames();
});
afterAll(() => {
  reset();
  resetContent();
  resetCatalogue();
  resetChoices();
  vi.unstubAllGlobals();
});

const EMPTY: CookSource = { ingredients: [], components: [], dishes: [], stock: [] };

const lines = (classic: Classic, portions: number, lang: Lang, source = EMPTY, choice = '') => {
  const found = must(
    classicListLines({
      classic,
      portions,
      lang,
      source,
      catalogue: catalogueEntries(),
      today: '2026-11-24',
      choice,
    }),
  );
  return { ...found, shown: found.lines.map((l) => `${l.name}: ${l.amount ?? '-'}`) };
};

const burrito = (): Classic => must(classicOf('burrito'));
/** The burrito with the guacamole in the sauce slot instead of the shipped lime sour cream. */
const withGuacamole = (): Classic => {
  const choice = must(fillingChoices(burrito(), 'en').find((c) => c.role === 'sauce'));
  expect(choice.current).toBe('crema-de-limon-sauce');
  return chooseAlternative(burrito(), choice.slotIndex, 'guacamole-sauce');
};

describe('classicListLines on shipped dishes', () => {
  test('the burrito frame as shipped, for 2, in English', () => {
    expect(lines(asChosen(burrito()), 2, 'en').shown).toEqual([
      'All-purpose flour: 150 g',
      'Baking powder: ½ tsp',
      'Salt: 2¾ tsp',
      'Lard: 30 g',
      'Chicken breast, skinless: 300 g',
      'Tomatoes: 3 pcs',
      'Garlic: 3 pcs',
      'Jalapeños: 1 pc',
      'Canola oil: 3½ tbsp',
      'Onions: 2 pcs',
      'Cumin seeds: ¼ tsp',
      'Dried oregano: ¼ tsp',
      'Long-grain white rice, enriched: 150 g',
      'Pinto beans: 125 g',
      'Sour cream: 125 g',
      'Lime juice: 1 tbsp',
    ]);
  });

  test('the burrito frame with the guacamole chosen, for 2, in German: the chosen filling’s lines, one ingredient in two lines added up', () => {
    const found = lines(asChosen(withGuacamole()), 2, 'de', EMPTY, 'sauce=guacamole-sauce');
    expect(found.shown).toEqual([
      'Weizenmehl 405: 150 g',
      'Backpulver: ½ TL',
      'Salz: 3 TL',
      'Schweineschmalz: 30 g',
      'Hähnchenbrust ohne Haut: 300 g',
      'Tomaten: 3 Stück',
      'Knoblauch: 3 Stück',
      'Jalapeños: 2 Stück',
      'Rapsöl: 3½ EL',
      'Zwiebeln: 2 Stück',
      'Kreuzkümmel: ¼ TL',
      'Oregano, getrocknet: ¼ TL',
      'Langkornreis, angereichert: 150 g',
      'Pintobohnen: 125 g',
      'Avocados: 2 Stück',
      'Koriandergrün: 7,5 g',
      'Limetten: 1 Stück',
    ]);
    expect(found.dish).toBe('shipped:burrito#sauce=guacamole-sauce');
  });

  test('frikandelle for 2: lines without an amount in the source go without one; the names the catalogue lacks come apart', () => {
    const de = lines(must(classicOf('frikandelle')), 2, 'de');
    expect(de.shown).toEqual([
      'Rindfleisch: -',
      'Eier: 2 Stück',
      'Salz: -',
      'Muskatnuss, gemahlen: -',
      'Semmelbrösel: 28 g',
      'Butter: -',
      'Sahne: -',
    ]);
    expect(de.free).toEqual(['Nierenfett', 'Wacholderbeeren']);
    expect(lines(must(classicOf('frikandelle')), 2, 'en').shown[1]).toBe('Eggs: 2 pcs');
  });

  test('minestrone for 3: pieces rounded up to whole ones', () => {
    const en = lines(must(classicOf('minestrone')), 3, 'en').shown;
    expect(en.filter((l) => !l.endsWith(': -'))).toEqual([
      'Garlic: 1 pc',
      'Potatoes: 1 pc',
      'Zucchini: 1 pc',
    ]);
    const de = lines(must(classicOf('minestrone')), 3, 'de').shown;
    expect(de.filter((l) => !l.endsWith(': -'))).toEqual([
      'Knoblauch: 1 Stück',
      'Kartoffeln: 1 Stück',
      'Zucchini: 1 Stück',
    ]);
  });

  test('the fine potato soup in German: spoons as the source wrote them, the origin with the dish', () => {
    const found = lines(must(classicOf('potato-soup-fine')), 4, 'de');
    expect(found.shown).toEqual([
      'Kartoffeln: -',
      'Zwiebeln: 1 Stück',
      'Butter: 1¼ EL',
      'Salz: -',
      'Mehl: ¾ EL',
      'Rotwein: 1¼ EL',
    ]);
    expect(found.free).toEqual(['Suppengemüse', 'Fleischextrakt']);
    expect(found.lines[0]?.origins).toEqual([
      {
        kind: 'recipe',
        app: 'culina',
        title: 'Sehr feine Kartoffelsuppe',
        dish: 'shipped:potato-soup-fine',
      },
    ]);
  });

  test('a short line asks for what is missing, written the same way', () => {
    const stock = {
      ...EMPTY,
      stock: [
        {
          id: 's1',
          ref: { kind: 'ingredient', id: 'fdc-168894' },
          amount: { value: 100, unit: 'g' },
        },
      ],
    } as unknown as CookSource;
    const flour = lines(asChosen(burrito()), 2, 'en', stock).shown[0];
    expect(flour).toBe('All-purpose flour: 50 g');
  });
});

describe('listAmountText', () => {
  test.each([
    [{ value: 2.5, unit: 'count' }, undefined, 'en', '3 pcs'],
    [{ value: 0.6666666667, unit: 'count' }, undefined, 'de', '1 Stück'],
    [{ value: 2, unit: 'count' }, undefined, 'en', '2 pcs'],
    [{ value: 1, unit: 'count' }, undefined, 'en', '1 pc'],
    [{ value: 0.4, unit: 'count' }, undefined, 'en', '1 pc'],
    [{ value: 1, unit: 'count' }, undefined, 'de', '1 Stück'],
    [{ value: 29.573529563, unit: 'ml' }, 'tbsp', 'de', '2 EL'],
    [{ value: 19.7, unit: 'ml' }, undefined, 'en', '20 ml'],
    [{ value: 9.86, unit: 'ml' }, undefined, 'de', '9,9 ml'],
    [{ value: 9.86, unit: 'ml' }, 'tsp', 'de', '2 TL'],
    [{ value: 7.46, unit: 'g' }, undefined, 'de', '7,5 g'],
    [{ value: 250.4, unit: 'g' }, undefined, 'en', '250 g'],
    [{ value: 1.5, unit: 'kg' }, undefined, 'de', '1,5 kg'],
  ] as const)('%j %s %s: %s', (amount, measure, lang, text) => {
    expect(listAmountText(amount, lang, measure)).toBe(text);
  });
});
