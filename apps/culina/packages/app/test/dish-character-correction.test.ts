// The cook's correction of a dish's characters (docs/data-model.md, Dish; docs/behaviour.md,
// Characters): the entry every list, chip and filter reads shows the corrected set; the editor's
// form keeps the correction as a difference, so a changed recipe still changes the rest; the
// stored record, export and import and the history carry it. Not proved here: the tick boxes in
// a browser (e2e/editor-more.mjs does that), and whether a rule is right for any dish.
import { buildExport, diffDishVersions, parseExport, serializeExport } from '@culina/engine';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { entryOfDish } from '../src/browse/entry';
import { matchesFilter } from '../src/browse/filter';
import { CHARACTER_ORDER, normalCorrection } from '../src/characters/correction';
import {
  characterSummary,
  characterTicks,
  computedOfDraft,
  setCharacter,
} from '../src/editor/dish-characters';
import { dishFormFromRecord, dishFormToRecord, newDishForm } from '../src/editor/dish-form';
import type { DishForm } from '../src/editor/dish-form';
import { recordValidators } from '../src/exchange/validators';
import { combinationJudge } from '../src/dishes/pick-judge';
import type { DishRecord, IngredientRecord, Notebook } from '../src/records';
import { schemaIssues } from '../src/store/validate';
import { diffRows } from '../src/versions/diff-text';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: IngredientRecord[] };
const byId = new Map(file.ingredients.map((r) => [r.id, r]));
const lookup = (id: string): IngredientRecord | undefined => byId.get(id);

const TOMATO = 'fdc-170457';
const ID = 'u-00000000-0000-4000-8000-000000000001';
const notebook = {
  components: [],
  facts: {},
  ingredientName: (id: string) => id,
} as unknown as Notebook;
const tomatoDish: DishRecord = {
  id: ID,
  name: 'Tomatoes',
  slots: [
    { role: 'main', ref: { kind: 'ingredient', id: TOMATO }, amount: { value: 300, unit: 'g' } },
  ],
  version: { family: ID, date: '2026-11-22' },
};
/** What the rules give 300 g of tomatoes: tomatoey by its share, light by its figures. */
const COMPUTED = ['tomatoey', 'light'];
const tomatoForm = (over: Partial<DishForm> = {}): DishForm => ({
  ...dishFormFromRecord(tomatoDish),
  ...over,
});
const record = (f: DishForm): DishRecord => {
  const built = dishFormToRecord(f, '2026-11-22');
  if (!built.ok) throw new Error(JSON.stringify(built.problems));
  return built.record;
};

describe('the entry of a dish', () => {
  test('control: without a correction the computed characters show', () => {
    expect(entryOfDish(notebook, tomatoDish, lookup).characters).toEqual(COMPUTED);
  });

  test('a removed character is gone from the entry and from the filter', () => {
    const dish = { ...tomatoDish, characters: { remove: ['tomatoey'] } };
    const entry = entryOfDish(notebook, dish, lookup);
    expect(entry.characters).toEqual(['light']);
    expect(matchesFilter(entry, { character: 'tomatoey' })).toBe(false);
  });

  test('an added character shows, in the order of the table, and the filter finds the dish', () => {
    const dish = { ...tomatoDish, characters: { add: ['creamy'] } };
    const entry = entryOfDish(notebook, dish, lookup);
    expect(entry.characters).toEqual(['tomatoey', 'creamy', 'light']);
    expect(matchesFilter(entry, { character: 'creamy' })).toBe(true);
    expect(matchesFilter(entryOfDish(notebook, tomatoDish, lookup), { character: 'creamy' })).toBe(
      false,
    );
  });

  test('an id the table does not know changes nothing', () => {
    const dish = { ...tomatoDish, characters: { add: ['smoky'], remove: ['gone'] } };
    expect(entryOfDish(notebook, dish, lookup).characters).toEqual(COMPUTED);
  });

  test('a combination of the random pick is not a stored dish: it is judged by the rules alone', () => {
    const judge = combinationJudge(notebook, lookup, { character: 'creamy' });
    expect(judge?.([])).toBe(false);
  });
});

describe('the editor', () => {
  test('the ticks: every character of the table once, ticked where the dish shows it', () => {
    const ticks = characterTicks(['tomatoey'], { add: ['creamy'] });
    expect(ticks.map((t) => t.id)).toEqual([...CHARACTER_ORDER]);
    expect(ticks.filter((t) => t.shown).map((t) => t.id)).toEqual(['tomatoey', 'creamy']);
    expect(ticks.filter((t) => t.shown !== t.computed).map((t) => t.id)).toEqual(['creamy']);
  });

  test('the closed fold names the characters ticked and how many the cook changed', () => {
    // A computed one taken away and one added: two changed, the shown ones in the table's order.
    const changed = characterTicks(['tomatoey', 'fried'], {
      add: ['creamy'],
      remove: ['tomatoey'],
    });
    expect(characterSummary(changed)).toEqual({ shown: ['fried', 'creamy'], corrected: 2 });
    // Control: the rules alone, nothing changed; and a dish that shows none.
    expect(characterSummary(characterTicks(['tomatoey'], undefined))).toEqual({
      shown: ['tomatoey'],
      corrected: 0,
    });
    expect(characterSummary(characterTicks([], undefined))).toEqual({ shown: [], corrected: 0 });
  });

  test('the draft is judged as it stands, before it can be saved', () => {
    expect(computedOfDraft(notebook, tomatoForm(), lookup)).toEqual(COMPUTED);
    // No name yet (not savable), and a slot without a filling: still judged by the filled slot.
    const draft = tomatoForm({ name: '' });
    draft.slots.push({ role: 'sauce', amount: '', unit: 'g' });
    expect(computedOfDraft(notebook, draft, lookup)).toEqual(COMPUTED);
    expect(computedOfDraft(notebook, newDishForm(ID), lookup)).toEqual([]);
  });

  test('unticking a computed character stores it as removed; ticking it again stores nothing', () => {
    const removed = setCharacter(undefined, ['tomatoey'], 'tomatoey', false);
    expect(removed).toEqual({ remove: ['tomatoey'] });
    expect(setCharacter(removed, ['tomatoey'], 'tomatoey', true)).toBeUndefined();
  });

  test('ticking a character no rule gives stores it as added; unticking it stores nothing', () => {
    const added = setCharacter(undefined, ['tomatoey'], 'creamy', true);
    expect(added).toEqual({ add: ['creamy'] });
    expect(setCharacter(added, ['tomatoey'], 'creamy', false)).toBeUndefined();
  });

  test('one tick leaves the other corrections as they were', () => {
    const both = setCharacter({ remove: ['tomatoey'] }, ['tomatoey'], 'creamy', true);
    expect(both).toEqual({ add: ['creamy'], remove: ['tomatoey'] });
    expect(setCharacter(both, ['tomatoey'], 'tomatoey', true)).toEqual({ add: ['creamy'] });
  });

  test('a correction outlives a change of the recipe, and the rest still follows the recipe', () => {
    // Removed while tomatoey was computed; the tomato is taken out, so nothing is computed.
    const form = tomatoForm({ characters: { remove: ['tomatoey'], add: ['creamy'] } });
    form.slots = [];
    const ticks = characterTicks(computedOfDraft(notebook, form, lookup), form.characters);
    expect(ticks.filter((t) => t.shown).map((t) => t.id)).toEqual(['creamy']);
    expect(form.characters).toEqual({ remove: ['tomatoey'], add: ['creamy'] });
  });

  test('the form reads the correction from the record and writes it back in the table order', () => {
    const r = record(
      tomatoForm({ characters: { add: ['creamy', 'cheesy'], remove: ['tomatoey'] } }),
    );
    expect(r.characters).toEqual({ add: ['cheesy', 'creamy'], remove: ['tomatoey'] });
    expect(dishFormFromRecord(r).characters).toEqual(r.characters);
    expect(schemaIssues('dishes', r)).toEqual([]);
  });

  test('no correction, an empty one and unknown ids store no field', () => {
    expect('characters' in record(tomatoForm())).toBe(false);
    expect('characters' in record(tomatoForm({ characters: {} }))).toBe(false);
    expect('characters' in record(tomatoForm({ characters: { add: ['smoky'] } }))).toBe(false);
    expect(normalCorrection({ add: ['creamy'], remove: ['creamy'] })).toEqual({ add: ['creamy'] });
  });
});

describe('the stored record', () => {
  const dish: DishRecord = { ...tomatoDish, characters: { add: ['creamy'], remove: ['tomatoey'] } };

  test('the schema takes the two lists and refuses an empty correction', () => {
    expect(schemaIssues('dishes', dish)).toEqual([]);
    expect(schemaIssues('dishes', { ...tomatoDish, characters: {} })).not.toEqual([]);
    expect(schemaIssues('dishes', { ...tomatoDish, characters: { add: [] } })).not.toEqual([]);
  });

  test('export and import carry the correction', () => {
    const text = serializeExport(
      buildExport({ dishes: [{ ...dish }] }, '2026-11-22T08:00:00.000Z'),
    );
    const read = parseExport(text, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect(read.content.records.dishes).toEqual([dish]);
  });

  test("the history names a changed correction by the characters' names", () => {
    const after = { ...dish, id: 'u-00000000-0000-4000-8000-000000000002' };
    const diff = diffDishVersions(tomatoDish, after);
    if (!diff.ok) throw new Error(diff.error.code);
    expect(diffRows(notebook, diff.diff, true).map((r) => r.text)).toEqual([
      'What it is like: empty → added: Creamy, taken away: Tomatoey',
    ]);
  });
});
