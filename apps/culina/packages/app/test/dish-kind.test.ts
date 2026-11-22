// The course and the cuisine of a dish of the notebook (docs/data-model.md, Dish; docs/behaviour.md,
// Editor): the editor's form keeps them, the store's compiled schema takes the classic's lists and
// nothing else, a copied classic keeps its course and its country, and the history names a change
// by its words. Not proved here: the two selects in a browser (e2e/editor.spec.mjs does that).
import {
  buildExport,
  copyClassic,
  diffDishVersions,
  parseExport,
  serializeExport,
} from '@culina/engine';
import { describe, expect, test } from 'vitest';
import { CLASSICS } from '../src/classics/index';
import { dishFormFromRecord, dishFormToRecord, newDishForm } from '../src/editor/dish-form';
import type { DishForm } from '../src/editor/dish-form';
import { recordValidators } from '../src/exchange/validators';
import type { DishRecord, Notebook } from '../src/records';
import { schemaIssues } from '../src/store/validate';
import { diffRows } from '../src/versions/diff-text';
import { must } from './must';

const ID = 'u-00000000-0000-4000-8000-000000000001';
const form = (over: Partial<DishForm>): DishForm => ({
  ...newDishForm(ID),
  name: 'Plate',
  slots: [{ role: 'main', ref: { kind: 'ingredient', id: 'salt' }, amount: '', unit: 'g' }],
  ...over,
});
const record = (f: DishForm): DishRecord => {
  const built = dishFormToRecord(f, '2026-11-21');
  if (!built.ok) throw new Error(JSON.stringify(built.problems));
  return built.record;
};

describe('the dish form', () => {
  test('a new dish states neither; "not stated" stores no field', () => {
    const r = record(form({}));
    expect('course' in r).toBe(false);
    expect('cuisine' in r).toBe(false);
    expect(newDishForm(ID)).toMatchObject({ course: '', cuisine: '' });
  });

  test('a chosen course and cuisine are stored and read back into the form', () => {
    const r = record(form({ course: 'soup', cuisine: 'fr' }));
    expect(r).toMatchObject({ course: 'soup', cuisine: 'fr' });
    expect(dishFormFromRecord(r)).toMatchObject({ course: 'soup', cuisine: 'fr' });
    expect(schemaIssues('dishes', r)).toEqual([]);
  });

  test('a draft written before the fields existed still saves, without them', () => {
    const { course: _c, cuisine: _k, ...older } = form({});
    void _c;
    void _k;
    const r = record(older as DishForm);
    expect('course' in r || 'cuisine' in r).toBe(false);
  });

  test('a value the lists do not have is not stored (a hand-edited draft)', () => {
    const r = record(form({ course: 'brunch', cuisine: 'jp' }));
    expect('course' in r || 'cuisine' in r).toBe(false);
  });
});

describe('the stored record', () => {
  const base: DishRecord = record(form({}));
  test('the schema takes the courses and countries of a classic, and nothing else', () => {
    expect(schemaIssues('dishes', { ...base, course: 'dessert', cuisine: 'es' })).toEqual([]);
    expect(schemaIssues('dishes', { ...base, course: 'brunch' })).not.toEqual([]);
    expect(schemaIssues('dishes', { ...base, cuisine: 'jp' })).not.toEqual([]);
  });

  test('export and import carry both fields; a file with another code is refused', () => {
    const dish = { ...base, course: 'side' as const, cuisine: 'de' as const };
    const text = serializeExport(buildExport({ dishes: [dish] }, '2026-11-21T08:00:00.000Z'));
    const read = parseExport(text, recordValidators);
    if (!read.ok) throw new Error(read.error.code);
    expect(read.content.records.dishes).toEqual([dish]);
    const other = text.replace('"cuisine": "de"', '"cuisine": "jp"');
    expect(parseExport(other, recordValidators).ok).toBe(false);
  });

  test('a copied classic keeps its course, and its country as the cuisine', () => {
    let n = 0;
    const copied = CLASSICS.map((classic) => ({
      classic,
      result: copyClassic(classic, {
        lang: 'en',
        date: '2026-11-21',
        newId: () => `u-00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
      }),
    })).filter((c) => c.result.ok);
    expect(copied.length).toBeGreaterThan(0);
    for (const { classic, result } of copied) {
      if (!result.ok) continue;
      expect(result.dish).toMatchObject({ course: classic.course, cuisine: classic.country });
      expect(schemaIssues('dishes', result.dish), classic.id).toEqual([]);
    }
  });

  test('the history names a change of course or cuisine by its words', () => {
    const before = { ...base, cuisine: 'it' as const };
    const after = {
      ...base,
      id: 'u-00000000-0000-4000-8000-000000000002',
      course: 'main' as const,
    };
    const diff = diffDishVersions(before, after);
    if (!diff.ok) throw new Error(diff.error.code);
    const rows = diffRows({} as Notebook, diff.diff, true);
    expect(rows.map((r) => r.text)).toEqual([
      'Course: empty → Main course',
      'Cuisine: Italian → empty',
    ]);
    expect(must(rows[0]).kind).toBe('field');
  });
});
