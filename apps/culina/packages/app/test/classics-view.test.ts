// The view logic of the classics screens, without a DOM: lists, the dish view (amounts are the
// engine's, formatted), the steps with their notes, the content language and the routes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { deriveClassic, validateClassic } from '@culina/engine';
import { cookView } from '../src/classics/cook-view';
import { dishView } from '../src/classics/dish-view';
import {
  LANG_KEY,
  parseLangChoice,
  readLangChoice,
  resolveLang,
  writeLangChoice,
} from '../src/classics/lang';
import { classicRows, countryChoices, isCountry } from '../src/classics/list-view';
import { actionFromHash, hashFor, navEntryFor, paramFromHash, routeFromHash } from '../src/router';
import {
  EXAMPLE_CLASSICS,
  EXAMPLE_TECHNIQUES,
  NAMES,
  PAN_DISH,
  SECOND_DISH,
} from './classics-fixture';
import { must } from './must';

const catalogue = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: { id: string }[] };

describe('the fictional example content', () => {
  test('meets the engine rules, so the screens are tested on a real shape', () => {
    for (const classic of EXAMPLE_CLASSICS) {
      expect(
        validateClassic(classic, {
          techniques: EXAMPLE_TECHNIQUES,
          ingredientIds: new Set(catalogue.ingredients.map((i) => i.id)),
        }),
      ).toEqual({ ok: true });
    }
  });
});

describe('the lists', () => {
  test('offer every country, an empty one with a count of 0', () => {
    expect(countryChoices(EXAMPLE_CLASSICS)).toEqual([
      { country: 'de', count: 1 },
      { country: 'it', count: 1 },
      { country: 'fr', count: 0 },
      { country: 'es', count: 0 },
    ]);
    expect(countryChoices([]).every((c) => c.count === 0)).toBe(true);
    expect(isCountry('fr')).toBe(true);
    expect(isCountry('xx')).toBe(false);
  });
  test('name a dish in the content language with its course and meat flag', () => {
    expect(classicRows(EXAMPLE_CLASSICS, 'de', 'en')).toEqual([
      {
        id: 'example-pan-dish',
        name: 'Example pan dish (fictional)',
        course: 'main',
        vegetarian: true,
      },
    ]);
    expect(must(classicRows(EXAMPLE_CLASSICS, 'it', 'de')[0]).name).toBe(
      'Zweites Beispielgericht (erfunden)',
    );
    expect(classicRows(EXAMPLE_CLASSICS, 'es', 'en')).toEqual([]);
  });
});

describe('the dish view', () => {
  const shown = (portions: number, lang: 'en' | 'de' = 'en') => {
    const done = dishView(PAN_DISH, portions, lang, NAMES);
    if (!done.ok) throw new Error(done.code);
    return done.view;
  };
  test('shows the engine amounts for the default portions and scales with them', () => {
    const engine = deriveClassic(PAN_DISH, { portions: 2, lang: 'en' });
    expect(engine.ok && engine.components[0]?.lines[0]?.amount).toEqual({ value: 100, unit: 'g' });
    const lines = must(shown(2).components[0]).lines;
    expect(lines.map((l) => l.amount)).toEqual(['100 g', '100 ml to 150 ml', undefined]);
    expect(must(shown(8).components[0]).lines[0]?.amount).toBe('400 g');
  });
  test('keeps a line without an amount; the words for it only where the source says them', () => {
    const salt = must(shown(2).components[0]).lines[2];
    expect(salt).toMatchObject({
      name: 'name of fdc-173468',
      amountWord: 'to taste',
      settled: false,
    });
    expect(salt?.note).toBeUndefined();
    expect(salt?.amount).toBeUndefined();
    // Without `amountWord` a line shows its name alone: no "to taste" is made up.
    const bare = structuredClone(PAN_DISH);
    const line = must(bare.components?.[0]).lines[2] as { amountWord?: string };
    delete line.amountWord;
    const view = dishView(bare, 2, 'en', NAMES);
    expect(view.ok && view.view.components[0]?.lines[2]?.amountWord).toBeUndefined();
  });
  test('keeps the remarks about the source apart from the line', () => {
    const view = shown(2);
    const salt = must(view.components[0]).lines[2];
    expect(salt?.sourceNote).toBe('Invented example: the source says to taste.');
    expect(view.sourceRemarks.lines).toContainEqual({
      name: 'name of fdc-173468',
      remark: 'Invented example: the source says to taste.',
    });
    expect(view.sourceRemarks.lines).toContainEqual({
      name: 'name of fdc-173410',
      original: '2 Example-measures',
    });
  });
  test('marks what was settled and keeps the source wording', () => {
    const lines = must(shown(2).components[0]).lines;
    expect(lines[1]?.settled).toBe(true);
    expect(lines[0]?.original).toBe('2 Example-measures');
    expect(shown(2)).not.toHaveProperty('settled');
  });
  test('gives the persons, the source, the check and the content language', () => {
    const view = shown(2, 'de');
    expect(view.name).toBe('Beispiel-Pfannengericht (erfunden)');
    expect(view.originalName).toBe('Example pan dish');
    expect(view.persons).toEqual({ value: 4, basis: 'stated' });
    expect(view.source.author).toBe('Example Author');
    expect(view.check.method).toBe('second-reader');
    expect(must(view.components[0]).lines[2]?.amountWord).toBe('to taste');
  });
  test('names a component slot by its component and a wanted line by its name', () => {
    expect(shown(2).slots[0]?.name).toBe('Example sauce');
    expect(shown(2).slots[0]?.amountWord).toBeUndefined();
    const second = dishView(SECOND_DISH, 2, 'en', NAMES);
    expect(second.ok && second.view.components[0]?.lines[0]?.name).toBe('Example broth stock');
  });
  test('refuses portions of zero with the engine code', () => {
    expect(dishView(PAN_DISH, 0, 'en', NAMES)).toEqual({ ok: false, code: 'invalid-portions' });
  });
});

describe('the steps', () => {
  const steps = (learned: string[] = [], classic = PAN_DISH) => {
    const done = cookView(classic, 2, 'en', NAMES, EXAMPLE_TECHNIQUES, new Set(learned));
    if (!done.ok) throw new Error(done.code);
    return done.steps;
  };
  test('come in order with the lines they use, time and temperature as the source gives them', () => {
    const all = steps();
    expect(all.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(all[0]).toMatchObject({ text: 'Melt the fat over low heat.', time: '5 min' });
    expect(all[0]?.lines.map((l) => l.amount)).toEqual(['100 g']);
    expect(all[1]?.temperature).toBe('170 to 180 °C');
    expect(all[1]?.lines.map((l) => l.amount)).toEqual(['100 ml to 150 ml']);
    expect(all[2]?.lines[0]?.amountWord).toBe('to taste');
  });
  test('show the technique note until the skill is learned, on any dish', () => {
    expect(steps().map((s) => s.note)).toEqual([true, false, false]);
    expect(steps(['example-technique']).some((s) => s.note)).toBe(false);
    expect(steps(['example-technique'], SECOND_DISH).some((s) => s.note)).toBe(false);
    expect(steps([], SECOND_DISH).map((s) => s.note)).toEqual([true, false]);
  });
  test('an unknown technique gives no note and no failure', () => {
    const done = cookView(PAN_DISH, 2, 'en', NAMES, [], new Set());
    expect(done.ok && done.steps.some((s) => s.note)).toBe(false);
  });
});

describe('the content language', () => {
  test('follows the device unless English or German is chosen', () => {
    expect(resolveLang('device', ['de-AT', 'en'])).toBe('de');
    expect(resolveLang('device', ['en-GB', 'de'])).toBe('en');
    expect(resolveLang('device', [])).toBe('en');
    expect(resolveLang('de', ['en'])).toBe('de');
    expect(resolveLang('en', ['de'])).toBe('en');
  });
  test('is kept like the theme and survives a missing or throwing store', () => {
    const data = new Map<string, string>();
    const store = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    expect(readLangChoice(store)).toBe('device');
    expect(writeLangChoice(store, 'de')).toBe(true);
    expect(data.get(LANG_KEY)).toBe('de');
    expect(readLangChoice(store)).toBe('de');
    expect(parseLangChoice('fr')).toBe('device');
    expect(writeLangChoice(null, 'en')).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('no');
      },
    };
    expect(readLangChoice(broken)).toBe('device');
    expect(writeLangChoice(broken, 'en')).toBe(false);
  });
});

describe('the routes of the classics', () => {
  test('carry a country, a dish and the cook action; they belong to Start', () => {
    expect(routeFromHash('#/classics/it')).toBe('classics');
    expect(paramFromHash('#/classics/it')).toBe('it');
    expect(paramFromHash('#/classic/example-pan-dish')).toBe('example-pan-dish');
    expect(actionFromHash('#/classic/example-pan-dish/cook')).toBe('cook');
    expect(actionFromHash('#/classic/example-pan-dish')).toBeUndefined();
    expect(hashFor('classic', 'example-pan-dish', 'cook')).toBe('#/classic/example-pan-dish/cook');
    expect(hashFor('classics', 'de')).toBe('#/classics/de');
    expect(navEntryFor('classics')).toBe('notebook');
    expect(navEntryFor('classic')).toBe('notebook');
  });
});
