// The character rules on the shipped data: the table against the catalogue, the facts of a
// shipped dish and of a dish of the notebook, and what the rules say of dishes everyone knows.
// The catalogue and the classics are the shipped files; the notebook is built in memory.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { CLASSICS } from '../src/classics/index';
import { classesOf } from '../src/characters/classes';
import { factsOfClassic } from '../src/characters/classic';
import { factsOfDish } from '../src/characters/dish';
import { CHARACTER_TABLE } from '../src/characters/table';
import { characterChips, characterIds } from '../src/characters/view';
import type { ComponentRecord, DishRecord, IngredientRecord, Notebook } from '../src/records';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: IngredientRecord[] };
const byId = new Map(file.ingredients.map((r) => [r.id, r]));
const lookup = (id: string): IngredientRecord | undefined => byId.get(id);

const TOMATO = 'fdc-170457';
const CREAM = 'fdc-170859';
const PASTA = 'fdc-168927';
const version = { family: 'f', date: '2026-11-21' };

const of = (id: string): string[] => {
  const classic = CLASSICS.find((c) => c.id === id);
  if (classic === undefined) throw new Error(id);
  return characterIds(factsOfClassic(classic, lookup));
};

describe('the table', () => {
  test('every class is a catalogue id or a category the catalogue has', () => {
    const categories = new Set(
      file.ingredients.flatMap((r) => {
        const c = r['x-fdc']?.category ?? r['x-group']?.category;
        return c === undefined ? [] : [`category:${c}`];
      }),
    );
    const unknown = CHARACTER_TABLE.flatMap((rule) =>
      [...rule.when, ...(rule.unless ?? [])]
        .flatMap((clause) => clause.ingredients ?? [])
        .filter((c) => !byId.has(c) && !categories.has(c))
        .map((c) => `${rule.id}: ${c}`),
    );
    expect(unknown).toEqual([]);
  });

  test('ids are unique, and every row has both names and says what it rests on', () => {
    expect(new Set(CHARACTER_TABLE.map((r) => r.id)).size).toBe(CHARACTER_TABLE.length);
    for (const rule of CHARACTER_TABLE) {
      expect(rule.name.en, rule.id).not.toBe('');
      expect(rule.name.de, rule.id).not.toBe('');
      expect(rule.basis.length, rule.id).toBeGreaterThan(20);
    }
  });
});

describe('classes of an ingredient', () => {
  test('a tomato is itself, its group and its USDA category', () => {
    expect(classesOf(TOMATO, lookup)).toEqual([
      TOMATO,
      'category:Vegetables and Vegetable Products',
      'fdc-group-tomatoes',
    ]);
  });

  test('an unknown id is only itself', () => {
    expect(classesOf('u-mine', lookup)).toEqual(['u-mine']);
  });
});

describe('shipped dishes', () => {
  test('gazpacho is tomatoey and uncooked, and not creamy although it is an emulsion', () => {
    expect(of('gazpacho-andaluz')).toEqual(expect.arrayContaining(['tomatoey', 'uncooked']));
    expect(of('gazpacho-andaluz')).not.toContain('creamy');
  });

  test('sauerbraten is braised, and not fried although it is seared', () => {
    expect(of('sauerbraten')).toContain('braised');
    expect(of('sauerbraten')).not.toContain('fried');
  });

  test('Napfkuchen is from the oven and not creamy although it has milk and butter', () => {
    expect(of('napfkuchen')).toContain('baked');
    expect(of('napfkuchen')).not.toContain('creamy');
  });

  test('cauliflower with béchamel is creamy; minestrone with cheese on top is not cheesy', () => {
    expect(of('cavolfiore-balsamella')).toContain('creamy');
    expect(of('minestrone')).not.toContain('cheesy');
  });

  test('meat and fish are read from the USDA category of the line', () => {
    expect(of('sauerbraten')).toContain('with-meat');
    expect(of('marinierte-heringe')).toContain('with-fish');
    expect(of('gazpacho-andaluz')).not.toContain('with-meat');
  });

  test('a boiled dinner whose meat has no amount is not called light', () => {
    expect(of('cocido-ordinario')).not.toContain('light');
    expect(of('pot-au-feu')).not.toContain('light');
  });

  test('every shipped dish is judged', () => {
    for (const classic of CLASSICS) {
      expect(factsOfClassic(classic, lookup), classic.id).toBeDefined();
    }
  });
});

describe('a dish of the notebook', () => {
  const sauce = (id: string, main: string): ComponentRecord => ({
    id,
    name: id,
    role: 'sauce',
    lines: [
      { ref: { kind: 'ingredient', id: main }, amount: { value: 300, unit: 'g' } },
      { ref: { kind: 'ingredient', id: 'fdc-169230' }, amount: { value: 5, unit: 'g' } },
    ],
    steps: [{ technique: 'simmer' }],
    version,
  });
  const nb: Notebook = {
    components: [sauce('c-tomato', TOMATO), sauce('c-cream', CREAM)],
    facts: {},
    ingredientName: (id) => id,
    ingredientYields: () => undefined,
  };
  const dish = (sauceId: string): DishRecord => ({
    id: 'd',
    name: 'Pasta',
    slots: [
      { role: 'starch', ref: { kind: 'ingredient', id: PASTA }, amount: { value: 100, unit: 'g' } },
      { role: 'sauce', ref: { kind: 'component', id: sauceId }, amount: { value: 150, unit: 'g' } },
    ],
    version,
  });

  test('150 g of tomato sauce on 100 g of pasta: tomato is 147.5 of 250 g, tomatoey by share', () => {
    const facts = factsOfDish(nb, dish('c-tomato'), lookup);
    expect(facts.lines.map((l) => l.g)).toEqual([
      100,
      expect.closeTo(147.54, 2),
      expect.closeTo(2.46, 2),
    ]);
    expect(characterIds(facts)).toEqual(['tomatoey']);
  });

  test('the same dish with the cream sauce is creamy and rich, and no longer tomatoey', () => {
    expect(characterIds(factsOfDish(nb, dish('c-cream'), lookup))).toEqual(['creamy', 'rich']);
  });

  test('a slot without amount gives lines without mass, so presence decides', () => {
    const open: DishRecord = {
      ...dish('c-tomato'),
      slots: [{ role: 'sauce', ref: { kind: 'component', id: 'c-tomato' } }],
    };
    const facts = factsOfDish(nb, open, lookup);
    expect(facts.lines.every((l) => l.g === undefined)).toBe(true);
    expect(characterIds(facts)).toEqual(['tomatoey']);
  });

  test('the techniques are those of the components’ steps', () => {
    expect(factsOfDish(nb, dish('c-tomato'), lookup)).toMatchObject({
      techniques: ['simmer'],
      stepsKnown: true,
    });
  });
});

describe('chips', () => {
  test('are named in the content language and carry what the rule rests on', () => {
    expect(characterChips(['tomatoey'], 'de')[0]).toMatchObject({
      id: 'tomatoey',
      label: 'Tomatig',
    });
    expect(characterChips(['tomatoey'], 'en')[0]?.basis).toContain('Judgement');
  });
});
