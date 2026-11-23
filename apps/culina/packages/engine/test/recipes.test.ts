// The recipe import format: the reader of written amounts, the unit words with a size, the
// checks beyond the schema and the records one recipe becomes (docs/exchange.md, The recipe
// import format). Pure functions on hand-written answers: no real model's answer is read here.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  availableModes,
  checkRecipes,
  componentRoles,
  givenAmount,
  importRecipe,
  isDishRecipe,
  noFixedSizeWord,
  parseCooklang,
  ingredientUses,
  readWrittenAmount,
  recipeLines,
  resolveAmount,
  sizedIn,
  sizedWord,
} from '../src/index';
import type { LineDecision, RecipeAnswer, RecipeEntry } from '../src/index';

const example = JSON.parse(
  readFileSync(new URL('../schemas/examples/recipe-import.valid.json', import.meta.url), 'utf8'),
) as RecipeAnswer;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
type Doc = any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('readWrittenAmount', () => {
  test.each([
    ['200 g', 200, 'g'],
    ['200g', 200, 'g'],
    ['1,5 kg', 1.5, 'kg'],
    ['1.5 kg', 1.5, 'kg'],
    ['0,125 l', 0.125, 'l'],
    ['1/2 TL', 0.5, 'TL'],
    ['1 1/2 EL', 1.5, 'EL'],
    ['½ TL', 0.5, 'TL'],
    ['1½ EL', 1.5, 'EL'],
    ['1 ½ EL', 1.5, 'EL'],
    ['3', 3, undefined],
    ['1 Prise', 1, 'Prise'],
  ])('%s', (text, value, unit) => {
    const q = readWrittenAmount(text);
    expect(q?.value).toBeCloseTo(value, 10);
    expect(q?.unit).toBe(unit);
  });
  test.each(['etwas', 'nach Geschmack', '2-3 EL', '2 bis 3 EL', '1.000 g', '1,250 kg', '0 g'])(
    '%s has no value and keeps its words',
    (text) => {
      const q = readWrittenAmount(text);
      expect(q?.value).toBeUndefined();
      expect([q?.text, q?.unit].filter(Boolean).join(' ')).toBe(text);
    },
  );
  test('an empty text is no amount', () => {
    expect(readWrittenAmount('  ')).toBeUndefined();
  });
});

describe('unit words without a table unit', () => {
  test('no word has a size yet: EL, TL, Prise, Msp., Becher and Päckchen are words without one', () => {
    for (const w of [
      'EL',
      'Esslöffel',
      'tl',
      'Prise',
      'Msp.',
      'Messerspitze',
      'Becher',
      'Päckchen',
    ]) {
      expect(sizedWord(w), w).toBeUndefined();
      expect(noFixedSizeWord(w), w).toBe(true);
    }
  });
  test('"2 EL", "1 Prise" and "1 Becher" are not given: open or weighed only', () => {
    for (const t of ['2 EL', '1 TL', '1 Prise', '1 Becher']) {
      expect(availableModes(readWrittenAmount(t), {}), t).toEqual(['grams', 'open']);
    }
    expect(resolveAmount(readWrittenAmount('2 EL'), { mode: 'open' }, {})).toEqual({
      ok: true,
      unmeasured: true,
      original: '2 EL',
    });
  });
  test('the machinery: a word with a size in the table is given as that size, the words in the note', () => {
    const table = {
      X: { words: ['X', 'Xes'], unit: 'ml', factor: 15, source: 'a named source' },
    };
    expect(sizedIn(table, 'xes')).toEqual({
      key: 'X',
      unit: 'ml',
      factor: 15,
      source: 'a named source',
    });
    expect(sizedIn(table, 'EL')).toBeUndefined();
  });
  test('a table word stays as it was: "2 tbsp" is 2 tbsp, no note', () => {
    expect(resolveAmount(readWrittenAmount('2 tbsp'), { mode: 'given' }, {})).toEqual({
      ok: true,
      amount: { value: 2, unit: 'tbsp' },
      unmeasured: false,
    });
  });
  test('a Cooklang file reads its words by the same table: {2%EL} stays open', () => {
    const doc = parseCooklang('Add @Öl{2%EL}.');
    expect(givenAmount(ingredientUses(doc)[0]?.quantity)).toBeUndefined();
  });
});

describe('checkRecipes', () => {
  test('the example has no problem', () => {
    expect(checkRecipes(example)).toEqual([]);
  });
  const codes = (change: (r: Doc) => void): string[] => {
    const a = clone(example);
    change(a.recipes[0]);
    return checkRecipes(a).map((p) => p.code);
  };
  test('names that point nowhere or twice', () => {
    expect(codes((r) => (r.components[1].name = 'batter'))).toContain('duplicate-component');
    expect(codes((r) => (r.slots[0].component = 'Dough'))).toContain('unknown-component');
    expect(codes((r) => (r.slots[1].alternatives = ['Jam']))).toContain('unknown-alternative');
    expect(codes((r) => (r.slots[1].alternatives = ['Batter']))).toContain('alternative-in-slot');
    expect(
      codes((r) => {
        r.slots[0].alternatives = ['Cinnamon sugar'];
      }),
    ).toContain('alternative-twice');
    expect(codes((r) => (r.slots[2].alternatives = ['Cinnamon sugar']))).toContain(
      'alternatives-on-ingredient',
    );
    expect(codes((r) => (r.slots[0].amount = '200 g'))).toContain('amount-on-component');
    expect(codes((r) => delete r.slots[1].alternatives)).toEqual(['component-unused']);
  });
});

const recipe = (i: number): RecipeEntry => example.recipes[i] as RecipeEntry;
const decide = (r: RecipeEntry): LineDecision[] =>
  recipeLines(r).map((use, i) => ({
    target: { kind: 'ingredient', id: `ing-${i}` },
    amount: availableModes(use.quantity, {}).includes('given')
      ? { mode: 'given' }
      : { mode: 'open' },
  }));

describe('importRecipe', () => {
  test('lines in order: components, then ingredient slots; guessed and written kept', () => {
    const uses = recipeLines(recipe(0));
    expect(uses.map((u) => u.name)).toEqual([
      'flour',
      'milk',
      'eggs',
      'salt',
      'butter',
      'apples',
      'sugar',
      'cinnamon',
      'icing sugar',
    ]);
    expect(uses[4]).toMatchObject({ guessed: true, written: '2 EL', component: 0 });
    expect(uses[8]).toMatchObject({ slot: 2, guessed: false });
  });

  test('a dish: slots, an alternative with the slot role, guessed in the note', () => {
    const r = recipe(0);
    expect(isDishRecipe(r)).toBe(true);
    const roles = componentRoles(r);
    expect(roles).toEqual(['main', 'sauce', 'sauce']);
    const done = importRecipe(r, decide(r), {
      id: 'd1',
      name: 'Pancakes',
      date: '2026-11-23',
      change: 'Imported',
      portions: 4,
      components: r.components.map((c, i) => ({
        id: `c${i}`,
        name: c.name,
        role: roles[i] ?? 'main',
      })),
      guessedNote: 'guessed',
      facts: () => ({}),
    });
    expect(done.ok && done.kind).toBe('dish');
    if (!done.ok || done.kind !== 'dish') return;
    expect(done.dish.slots).toEqual([
      { role: 'main', ref: { kind: 'component', id: 'c0' } },
      { role: 'sauce', ref: { kind: 'component', id: 'c1' } },
      { role: 'garnish', ref: { kind: 'ingredient', id: 'ing-8' }, optional: true },
    ]);
    expect(done.dish.portions).toBe(4);
    expect(done.dish.steps).toEqual([{ note: 'Serve the pancakes with the sauce.' }]);
    expect(done.components.map((c) => c.role)).toEqual(['main', 'sauce', 'sauce']);
    const butter = ((done.components[0] as Doc).lines as { note?: string; amount?: unknown }[])[4];
    expect(butter).toEqual({
      ref: { kind: 'ingredient', id: 'ing-4' },
      note: 'for the pan, 2 EL, guessed',
    });
    // "1 Prise", "2 EL" and "1 TL" stay open, their words in the note; "icing sugar" has no amount.
    expect(done.unmeasured).toEqual([3, 4, 6, 7, 8]);
    expect(((done.components[0] as Doc).lines as { note?: string }[])[3]?.note).toBe('1 Prise');
  });

  test('one component without persons is a component with its yield and the steps', () => {
    const r = recipe(1);
    expect(isDishRecipe(r)).toBe(false);
    const done = importRecipe(r, decide(r), {
      id: 'c9',
      name: 'Vinaigrette',
      date: '2026-11-23',
      change: 'Imported',
      yieldGrams: 140,
      components: [{ id: 'c9', name: 'Vinaigrette', role: 'sauce' }],
      guessedNote: 'guessed',
      facts: () => ({}),
    });
    expect(done.ok && done.kind).toBe('component');
    if (!done.ok || done.kind !== 'component') return;
    expect(done.component).toMatchObject({
      id: 'c9',
      role: 'sauce',
      yield: { amount: { value: 140, unit: 'g' }, source: 'user' },
      version: { family: 'c9', date: '2026-11-23', change: 'Imported' },
    });
    expect(done.unmeasured).toEqual([2]);
  });

  test('the wrong number of decisions or components is refused', () => {
    const r = recipe(1);
    const base = {
      id: 'x',
      name: 'x',
      date: '2026-11-23',
      change: 'c',
      components: [{ id: 'x', name: 'x', role: 'sauce' }],
      guessedNote: 'g',
      facts: () => ({}),
    };
    expect(importRecipe(r, [], base)).toEqual({ ok: false, error: { code: 'decision-count' } });
    expect(importRecipe(r, decide(r), { ...base, components: [] })).toEqual({
      ok: false,
      error: { code: 'component-count' },
    });
  });
});
