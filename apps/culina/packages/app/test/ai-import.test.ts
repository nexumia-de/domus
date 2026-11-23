// Importing an AI's answer in the recipe import format: reading (a code fence, broken JSON, one
// sentence per schema error and per name problem), the model (names asked once over the answer,
// guessed marks, roles, yields), and saving two recipes in one transaction that Undo takes back.
// The store is fake-indexeddb and the answers are hand-written; no real model's answer is read.
import { beforeEach, describe, expect, test } from 'vitest';
import {
  MAX_ANSWER_CHARS,
  mayBeRecipeAnswer,
  readAnswer,
  short,
  unfenced,
} from '../src/exchange/ai-answer';
import {
  buildAiModel,
  componentLines,
  guessedLines,
  yieldGramsOf,
  type AiRecipeRow,
} from '../src/exchange/ai-model';
import { saveAiImport } from '../src/exchange/ai-save';
import { candidateIngredients } from '../src/exchange/candidates';
import { createForUnset, unresolvedNames } from '../src/exchange/cook-model';
import { undoImport } from '../src/exchange/json-apply';
import {
  getIngredient,
  listComponents,
  listDishes,
  listIngredients,
  saveRecord,
  startNotebook,
} from '../src/notebook';
import { freshFactory } from './store-helpers';
import { must } from './must';

const ANSWER = {
  format: 'culina-recipes',
  formatVersion: 1,
  recipes: [
    {
      title: 'Pancakes',
      persons: 4,
      source: { title: 'Family card', author: 'Anna', where: 'back side' },
      components: [
        {
          name: 'Batter',
          lines: [
            { ingredient: 'flour', amount: '250 g', role: 'flour' },
            { ingredient: 'milk', amount: '500 ml' },
            { ingredient: 'butter', amount: '2 EL', guessed: true },
          ],
          steps: ['Whisk.', 'Bake.'],
        },
        { name: 'Apple sauce', lines: [{ ingredient: 'apples', amount: '4' }] },
        { name: 'Cinnamon sugar', lines: [{ ingredient: 'sugar', amount: '2 EL' }] },
      ],
      slots: [
        { role: 'main', component: 'Batter' },
        { role: 'sauce', component: 'Apple sauce', alternatives: ['Cinnamon sugar'] },
      ],
    },
    {
      title: 'Brown butter',
      yield: '0.2 kg',
      components: [
        { name: 'Brown butter', role: 'sauce', lines: [{ ingredient: 'Butter', amount: '250 g' }] },
      ],
    },
  ],
};
const text = (value: unknown): string => JSON.stringify(value);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

beforeEach(async () => {
  await startNotebook({ indexedDB: freshFactory(), now: () => '2026-11-23T08:00:00.000Z' });
});

describe('reading an answer', () => {
  test('a Markdown code fence around the JSON is taken off', () => {
    expect(unfenced('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(readAnswer(`\`\`\`json\n${text(ANSWER)}\n\`\`\``).ok).toBe(true);
  });
  test('text that is no JSON, or JSON of another format, is one sentence', () => {
    expect(readAnswer('Here is your recipe: {')).toEqual({
      ok: false,
      sentences: [expect.stringContaining('not readable as JSON')],
    });
    expect(readAnswer('{"format":"culina-export"}')).toEqual({
      ok: false,
      sentences: [expect.stringContaining('"format" must be "culina-recipes"')],
    });
  });
  test('each schema error is one sentence naming its place', () => {
    const broken = clone(ANSWER) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    delete broken.recipes[0].components[0].lines[0].ingredient;
    broken.recipes[0].components[0].lines[1].id = 'fdc-milk';
    broken.recipes[0].persons = 0;
    broken.recipes[0].slots[0].ingredient = 'bread';
    broken.recipes[1].components[0].role = 'dessert';
    const read = readAnswer(text(broken));
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.sentences).toEqual([
      'Recipe 1 (Pancakes): "persons" must be a whole number from 1 to 100.',
      'Recipe 1 (Pancakes), component 1 (Batter), line 1: "ingredient" is needed.',
      'Recipe 1 (Pancakes), component 1 (Batter), line 2 (milk): "id" is not a field of the recipe format.',
      'Recipe 1 (Pancakes), slot 1: a slot is filled either by a "component" or by an "ingredient", one of the two.',
      'Recipe 2 (Brown butter), component 1 (Brown butter): "dessert" is not a role Culina knows for "role" (main, sauce, starch, crunch, acid, garnish).',
    ]);
  });
  test('a long title or name is shortened in the sentence to 40 characters with "…"', () => {
    const broken = clone(ANSWER) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    broken.recipes[0].title = 'Pancakes as my grandmother made them every Sunday in winter';
    broken.recipes[0].components[0].name = 'B'.repeat(200);
    delete broken.recipes[0].components[0].lines[0].ingredient;
    broken.recipes[0].slots[1].alternatives = ['J'.repeat(300)];
    const read = readAnswer(text(broken));
    expect(read.ok).toBe(false);
    if (read.ok) return;
    const title = 'Pancakes as my grandmother made them ev…';
    expect(title).toHaveLength(40);
    expect(read.sentences).toContain(
      `Recipe 1 (${title}), component 1 (${'B'.repeat(39)}…), line 1: "ingredient" is needed.`,
    );
    expect(read.sentences).toContain(
      `Recipe 1 (${title}), component 1 (${'B'.repeat(39)}…): "name" is longer than 120 characters.`,
    );
    expect(short('short')).toBe('short');
  });
  test('a name too long for the schema is shortened in its sentence too', () => {
    const broken = clone(ANSWER) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    broken.recipes[0].slots[1].alternatives = ['J'.repeat(100)];
    const read = readAnswer(text(broken));
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.sentences.every((s) => !s.includes('J'.repeat(41)))).toBe(true);
  });
  test('an answer longer than the limit is one sentence, refused before it is parsed', () => {
    expect(MAX_ANSWER_CHARS).toBe(1_000_000);
    // Twenty recipes (ten copies of the two here) stay far below the limit.
    const twenty = { ...ANSWER, recipes: Array.from({ length: 10 }, () => ANSWER.recipes).flat() };
    expect(twenty.recipes).toHaveLength(20);
    expect(text(twenty).length).toBeLessThan(MAX_ANSWER_CHARS / 50);
    const long = `{"format":"culina-recipes",${' '.repeat(MAX_ANSWER_CHARS)}}`;
    expect(readAnswer(long)).toEqual({
      ok: false,
      sentences: [
        'The answer is longer than 1,000,000 characters, more than Culina reads at once; split it into smaller answers.',
      ],
    });
    expect(mayBeRecipeAnswer(long)).toBe(true);
    expect(mayBeRecipeAnswer('{"format":"culina-export","x":"culina-recipes"}')).toBe(false);
  });
  test('a name that points nowhere is one sentence', () => {
    const broken = clone(ANSWER) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    broken.recipes[0].slots[1].alternatives = ['Jam'];
    expect(readAnswer(text(broken))).toEqual({
      ok: false,
      sentences: [
        'Recipe 1 (Pancakes), slot 2: the alternative "Jam" is not a component of the recipe.',
        'Recipe 1 (Pancakes): the component "Cinnamon sugar" is in no slot and is no slot\'s alternative.',
      ],
    });
  });
});

describe('the model and the save', () => {
  const answer = () => {
    const read = readAnswer(text(ANSWER));
    if (!read.ok) throw new Error(read.sentences.join(' '));
    return read.answer;
  };

  test('a name is asked once over the whole answer; guessed, roles and yields are carried', async () => {
    must(await saveRecord('ingredients', { id: 'butter', name: 'Butter' }));
    const model = buildAiModel(answer(), { ingredients: candidateIngredients(), components: [] });
    expect(model.rows.map((r) => r.label)).toEqual(['flour', 'milk', 'butter', 'apples', 'sugar']);
    // "butter" and "Butter" are one name, matched to the notebook's butter in both recipes.
    expect(model.rows[2]?.choice).toEqual({
      type: 'existing',
      target: { kind: 'ingredient', id: 'butter' },
    });
    expect(guessedLines(model).map((l) => l.use.name)).toEqual(['butter']);
    const [pancakes, brown] = model.recipes;
    expect(pancakes?.dish).toBe(true);
    expect(pancakes?.portions).toBe('4');
    expect(pancakes?.components.map((c) => [c.role, c.alternativeFor])).toEqual([
      ['main', undefined],
      ['sauce', undefined],
      ['sauce', 'Apple sauce'],
    ]);
    expect(
      componentLines(pancakes as AiRecipeRow, 0).map((l) => [l.use.name, l.role, l.mode]),
    ).toEqual([
      ['flour', 'flour', 'given'],
      ['milk', '', 'given'],
      ['butter', '', 'open'],
    ]);
    expect(brown?.dish).toBe(false);
    expect(brown?.yieldGrams).toBe('200');
    expect(yieldGramsOf('12 pieces')).toBeUndefined();
  });

  test('two recipes are saved in one transaction, the guessed line says so, Undo takes all back', async () => {
    const model = buildAiModel(answer(), { ingredients: candidateIngredients(), components: [] });
    expect(unresolvedNames(model)).toBe(5);
    createForUnset(model);
    const done = await saveAiImport(model);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.saved.map((s) => [s.kind, s.name])).toEqual([
      ['dishes', 'Pancakes'],
      ['components', 'Brown butter'],
    ]);
    expect(done.guessed).toEqual([{ name: 'butter', text: '2 EL' }]);
    // One new ingredient per name, though "butter" stands in both recipes.
    expect(
      listIngredients()
        .map((i) => i.name)
        .sort(),
    ).toEqual(['apples', 'butter', 'flour', 'milk', 'sugar'].sort());
    const dish = listDishes()[0];
    expect(dish?.portions).toBe(4);
    expect(dish?.slots.map((s) => s.role)).toEqual(['main', 'sauce']);
    expect(dish?.version.change).toBe(
      'Imported from an AI answer; source: Family card, Anna, back side',
    );
    const batter = listComponents().find((c) => c.name === 'Batter');
    // The source is free text in the change of version 1, of the dish and of each component.
    expect(batter?.version.change).toBe(dish?.version.change);
    // "2 EL" has no readable size yet: the line is open, its words and "guessed" in the note.
    expect(batter?.lines[2]).toEqual({ ref: batter?.lines[2]?.ref, note: '2 EL, guessed' });
    const sugar = listComponents().find((c) => c.name === 'Cinnamon sugar');
    expect(sugar?.role).toBe('sauce');
    const brown = listComponents().find((c) => c.name === 'Brown butter');
    expect(brown?.yield?.amount).toEqual({ value: 200, unit: 'g' });
    expect(listComponents()).toHaveLength(4);

    must(await undoImport());
    expect(listComponents()).toHaveLength(0);
    expect(listDishes()).toHaveLength(0);
    expect(listIngredients()).toHaveLength(0);
    expect(getIngredient(listIngredients()[0]?.id ?? 'none')).toBeUndefined();
  });

  test('nothing is saved before the save', () => {
    const model = buildAiModel(answer(), { ingredients: candidateIngredients(), components: [] });
    createForUnset(model);
    expect(listComponents()).toHaveLength(0);
    expect(listIngredients()).toHaveLength(0);
  });
});
