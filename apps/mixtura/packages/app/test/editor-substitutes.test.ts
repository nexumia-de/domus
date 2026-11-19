/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// Substitutes of a line in the editor (#89): read from a stored spec, edited in
// the draft, checked and written back as the engine's `listed-substitute` reads them.
import { makeableSpecs, buildStockIndex, ROOT_TEMPLATES } from '@mixtura/engine';
import { describe, expect, test } from 'vitest';
import { buildModel } from '../src/screens/browse/model';
import type { SpecData, Template } from '../src/screens/browse/types';
import { checkDraft } from '../src/screens/editor/check';
import { draftFromSpec, fingerprint, isDirty, updateLine } from '../src/screens/editor/draft';
import { pickerVM } from '../src/screens/editor/picker-vm';
import { editorVM } from '../src/screens/editor/view-model';
import { fixtureIngredients } from './browse-fixture';

const spec: SpecData = {
  id: 'u-1',
  lineageId: 'u-1',
  version: 1,
  name: 'Mine',
  method: 'shake',
  status: 'draft',
  lines: [
    { ingredientId: 'rum', amount: 60, unit: 'ml', substitutes: [{ ingredientId: 'cognac' }] },
    { ingredientId: 'lime', amount: 22.5, unit: 'ml' },
    { ingredientId: 'simple', amount: 22.5, unit: 'ml' },
  ],
};
const built = buildModel({
  ingredients: fixtureIngredients,
  templates: (ROOT_TEMPLATES as Template[]).map((value) => ({ value, origin: 'seed' as const })),
  specs: [{ value: spec, origin: 'user' as const }],
  vocabulary: {
    methods: [{ id: 'shake', name: 'Shake' }],
    glasses: [],
  },
  seedVersion: 'test',
});
if (!built.ok) throw new Error(built.reason);
const model = built.model;

describe('substitutes in the draft', () => {
  const draft = draftFromSpec(spec, 'user', undefined);

  test('a stored substitute is read into the draft and an untouched draft writes it back unchanged', () => {
    expect(draft.lines[0]!.substitutes).toEqual([{ ingredientId: 'cognac', amountText: '' }]);
    const check = checkDraft(model, draft, false);
    expect(check.ok).toBe(true);
    expect(check.spec.lines[0]!.substitutes).toEqual([{ ingredientId: 'cognac' }]);
    expect(isDirty(draft, fingerprint(draft))).toBe(false);
  });

  test('adding a substitute with an own amount stores number and unit', () => {
    const next = updateLine(draft, draft.lines[1]!.key, (l) => ({
      ...l,
      substitutes: [{ ingredientId: 'vermouth', amountText: '2 dashes' }],
    }));
    const check = checkDraft(model, next, false);
    expect(check.spec.lines[1]!.substitutes).toEqual([
      { ingredientId: 'vermouth', amount: 2, unit: 'dash' },
    ]);
    expect(isDirty(next, fingerprint(draft))).toBe(true);
  });

  test('an amount that is not understood blocks saving, in words', () => {
    const next = updateLine(draft, draft.lines[0]!.key, (l) => ({
      ...l,
      substitutes: [{ ingredientId: 'cognac', amountText: 'lots' }],
    }));
    const check = checkDraft(model, next, false);
    expect(check.ok).toBe(false);
    expect(check.lines[0]).toMatchObject({ status: 'error', field: 'substitute' });
    expect(check.lines[0]!.error).toContain('Cognac');
  });

  test('removing the last substitute leaves the line without the field', () => {
    const next = updateLine(draft, draft.lines[0]!.key, (l) => {
      const { substitutes: _gone, ...rest } = l;
      void _gone;
      return rest;
    });
    expect('substitutes' in checkDraft(model, next, false).spec.lines[0]!).toBe(false);
  });

  test('the editor view model lists them with the name', () => {
    const check = checkDraft(model, draft, false);
    const vm = editorVM(model, draft, check, 'metric', new Set(), null);
    expect(vm.lines[0]!.substitutes).toEqual([{ index: 0, name: 'Cognac', amountText: '' }]);
  });

  test('the engine reads the saved substitute as a listed substitute when it is in stock', () => {
    const check = checkDraft(model, draft, false);
    const lines = check.spec.lines.map((l) => ({
      ingredientId: l.ingredientId,
      ...(l.substitutes && { substitutes: l.substitutes }),
    }));
    const index = buildStockIndex(model.tree, [{ id: 'x', lines }]);
    const report = makeableSpecs(
      index,
      ['cognac', 'lime', 'simple'].map((ingredientId) => ({ ingredientId, present: true })),
      { mode: 'with-substitutes' },
    );
    expect(report.specs[0]!.lines[0]).toMatchObject({ rule: 'listed-substitute', by: 'cognac' });
  });
});

describe('the picker marks what is in stock', () => {
  const heading = { search: 's', browse: 'b', start: 't' };
  test('rows carry the mark for ingredients the stock has', () => {
    const vm = pickerVM(
      model,
      { lineKey: 'k1', query: 'rum', path: null, focus: false },
      heading,
      new Set(['rum']),
    );
    const rum = vm.rows.find((r) => r.id === 'rum');
    expect(rum?.inStock).toBe(true);
    expect(vm.rows.filter((r) => r.id !== 'rum').every((r) => !r.inStock)).toBe(true);
  });
});
