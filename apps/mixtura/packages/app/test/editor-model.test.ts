/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are indexed at known positions */
// The editor's view model and save path: lines read and checked, the balance
// from the valid lines, the draft as a spec, prepared ingredients with the
// engine's figures, and what the store holds after a save.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { buildModel, type BrowseModel } from '../src/screens/browse/model';
import type { Ingredient, SpecData, Template } from '../src/screens/browse/types';
import { checkDraft } from '../src/screens/editor/check';
import {
  blankDraft,
  draftFromSpec,
  emptyLine,
  fingerprint,
  insertLine,
  isDirty,
  moveLine,
  removeLine,
  updateLine,
  withTemplate,
} from '../src/screens/editor/draft';
import { saveDraft, versionSaver } from '../src/screens/editor/save';
import { parseDraft } from '../src/screens/editor/session';
import { editorVM } from '../src/screens/editor/view-model';
import type { Draft } from '../src/screens/editor/types';
import { fixtureIngredients, fixtureSpec } from './browse-fixture';
import { openFresh } from './helpers';
import { ROOT_TEMPLATES } from '@mixtura/engine';

const vector = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../engine/vectors/ingredients/prepared-syrup-1-1.json', import.meta.url),
    ),
    'utf8',
  ),
) as {
  ingredients: Ingredient[];
  expected: { sugar_g_per_100ml: number; abv_pct: number; acid_pct: number };
};

const vocabulary = {
  methods: [
    { id: 'shake', name: 'Shake' },
    { id: 'stir', name: 'Stir' },
  ],
  glasses: [{ id: 'coupe', name: 'Coupe' }],
};

function model(
  ingredients: Ingredient[] = fixtureIngredients,
  specs: SpecData[] = [],
): BrowseModel {
  const built = buildModel({
    ingredients,
    templates: (ROOT_TEMPLATES as Template[]).map((value) => ({ value, origin: 'seed' as const })),
    specs: specs.map((value) => ({ value, origin: 'user' as const })),
    vocabulary,
    seedVersion: 'test',
  });
  if (!built.ok) throw new Error(built.reason);
  return built.model;
}

const filled = (m: BrowseModel): Draft => {
  let draft: Draft = { ...blankDraft(), name: 'Test', method: 'shake' };
  const rows: [string, string][] = [
    ['rum', '60 ml'],
    ['lime', '1 oz'],
    ['simple', '3/4 oz'],
  ];
  for (const [ingredientId, amountText] of rows) {
    const added = emptyLine(draft);
    draft = updateLine(added.draft, added.key, (l) => ({ ...l, ingredientId, amountText }));
  }
  void m;
  return draft;
};

describe('checking a draft', () => {
  const m = model();

  test('a good draft is ok and the preview spec holds the valid lines with their numbers', () => {
    const check = checkDraft(m, filled(m), false);
    expect(check.ok).toBe(true);
    expect(check.spec.lines.map((l) => [l.ingredientId, l.amount, l.unit])).toEqual([
      ['rum', 60, 'ml'],
      ['lime', 1, 'oz_us'],
      ['simple', 0.75, 'oz_us'],
    ]);
  });

  test('an invalid amount never makes the draft saveable, and the other lines stay valid', () => {
    let draft = filled(m);
    draft = updateLine(draft, draft.lines[0]!.key, (l) => ({ ...l, amountText: 'lots' }));
    const check = checkDraft(m, draft, false);
    expect(check.ok).toBe(false);
    expect(check.lines[0]).toMatchObject({ status: 'error', field: 'amount' });
    expect(check.lines[1]?.status).toBe('ok');
    expect(check.spec.lines).toHaveLength(2);
    expect(check.blockers).toContain('Fix the lines marked above');
  });

  test('a name and a line are needed; empty lines are left out', () => {
    expect(checkDraft(m, blankDraft(), false).blockers).toEqual([
      'Add a name',
      'Add one ingredient with an amount',
    ]);
    const withEmpty = emptyLine({ ...filled(m), name: 'x' }).draft;
    const check = checkDraft(m, withEmpty, false);
    expect(check.ok).toBe(true);
    expect(check.lines.at(-1)?.status).toBe('empty');
    expect(check.spec.lines).toHaveLength(3);
  });

  test('an unknown ingredient and a missing ingredient are said in words', () => {
    let draft = filled(m);
    draft = updateLine(draft, draft.lines[0]!.key, (l) => ({ ...l, ingredientId: 'gone' }));
    draft = updateLine(draft, draft.lines[1]!.key, (l) => ({ ...l, ingredientId: '' }));
    const check = checkDraft(m, draft, false);
    expect(check.lines[0]?.error).toContain('not in the data');
    expect(check.lines[1]?.error).toContain('Choose an ingredient');
  });

  test('a top line takes an optional volume and no amount', () => {
    let draft = filled(m);
    draft = updateLine(draft, draft.lines[0]!.key, (l) => ({
      ...l,
      unit: 'top',
      amountText: '',
      topText: '90',
    }));
    const check = checkDraft(m, draft, false);
    expect(check.lines[0]?.line).toMatchObject({ unit: 'top', topMl: 90 });
    draft = updateLine(draft, draft.lines[0]!.key, (l) => ({ ...l, topText: 'lots' }));
    expect(checkDraft(m, draft, false).lines[0]?.field).toBe('volume');
  });

  test('an untouched stored line keeps its stored numbers exactly', () => {
    const spec = fixtureSpec('Old', [['rum', 22.5]], { status: 'on-menu' });
    spec.lines[0] = { ingredientId: 'rum', amount: 0.7333, unit: 'oz_imp' };
    const draft = draftFromSpec(spec, 'user', undefined);
    const line = checkDraft(m, draft, false).lines[0]?.line;
    expect(line).toMatchObject({ amount: 0.7333, unit: 'oz_imp' });
  });
});

describe('draft operations', () => {
  const m = model();

  test('a template adds empty lines with their roles and never touches typed lines', () => {
    const typed = filled(m);
    const template = ROOT_TEMPLATES.find((t) => t.id === 'daiquiri') as Template;
    const roleOf = (line: Draft['lines'][number]) =>
      line.ingredientId === 'rum' ? 'base' : undefined;
    const next = withTemplate(typed, template, roleOf);
    expect(next.templateId).toBe('daiquiri');
    expect(next.lines.slice(0, 3)).toEqual(typed.lines);
    const blank = withTemplate(blankDraft(), template, () => undefined);
    expect(blank.lines.map((l) => l.role).sort()).toEqual(['base', 'sour', 'sweet']);
    expect(blank.lines.every((l) => l.ingredientId === '')).toBe(true);
  });

  test('move, remove and put back', () => {
    const d = filled(m);
    const keys = d.lines.map((l) => l.key);
    expect(moveLine(d, keys[0]!, 2).lines.map((l) => l.key)).toEqual([keys[1], keys[2], keys[0]]);
    expect(moveLine(d, keys[0]!, -5)).toBe(d);
    const removed = removeLine(d, keys[1]!);
    expect(removed.draft.lines).toHaveLength(2);
    expect(insertLine(removed.draft, removed.line!, removed.at).lines.map((l) => l.key)).toEqual(
      keys,
    );
  });

  test('dirty means different from the saved draft, whatever the line keys', () => {
    const base = filled(m);
    const baseline = fingerprint(base);
    expect(isDirty(base, baseline)).toBe(false);
    const added = emptyLine(base);
    expect(isDirty(added.draft, baseline)).toBe(true);
    expect(isDirty(removeLine(added.draft, added.key).draft, baseline)).toBe(false);
  });

  test('a stored draft is read back, and something else is refused', () => {
    const d = filled(m);
    expect(parseDraft({ version: 1, draft: JSON.parse(JSON.stringify(d)) })).toEqual(d);
    expect(parseDraft({ version: 2, draft: d })).toBeNull();
    expect(parseDraft({ version: 1, draft: { name: 1 } })).toBeNull();
    expect(parseDraft(undefined)).toBeNull();
  });
});

describe('the view model', () => {
  const m = model();

  test('lines carry their role, the balance comes from the valid lines, a template is suggested', () => {
    const d = filled(m);
    const check = checkDraft(m, d, false);
    const vm = editorVM(m, d, check, 'metric', new Set(), null);
    expect(vm.lines.map((l) => [l.ingredient, l.role?.label])).toEqual([
      ['Rum', 'Base'],
      ['Lime Juice', 'Sour'],
      ['Simple Syrup', 'Sweet'],
    ]);
    expect(vm.balance.figures.map((f) => f.name)).toEqual(['ABV', 'Sugar', 'Acid']);
    expect(vm.balance.figures[0]?.known).toBe(true);
    expect(vm.suggestion?.name).toBe('Daiquiri');
    expect(vm.saveReason).toBeUndefined();
    const chosen = editorVM(m, { ...d, templateId: 'daiquiri' }, check, 'metric', new Set(), null);
    expect(chosen.suggestion).toBeUndefined();
  });

  test('a changed role is shown, the ingredient role stays named for "from the ingredient"', () => {
    let d = filled(m);
    d = updateLine(d, d.lines[0]!.key, (l) => ({ ...l, role: 'accent' }));
    const vm = editorVM(m, d, checkDraft(m, d, false), 'metric', new Set(), d.lines[0]!.key);
    expect(vm.lines[0]).toMatchObject({
      role: { label: 'Accent' },
      ownRole: 'Base',
      menuOpen: true,
    });
  });

  test('Save names what is missing', () => {
    const d = blankDraft();
    const vm = editorVM(m, d, checkDraft(m, d, false), 'metric', new Set(), null);
    expect(vm.saveReason).toBe('Add a name');
  });
});

describe('a prepared ingredient', () => {
  const m = model(vector.ingredients);
  const syrup = (): Draft => {
    let d: Draft = { ...blankDraft(), name: 'Syrup 1:1' };
    for (const [ingredientId, amountText] of [
      ['sugar', '100 g'],
      ['water', '100 ml'],
    ] as const) {
      const added = emptyLine(d);
      d = updateLine(added.draft, added.key, (l) => ({ ...l, ingredientId, amountText }));
    }
    return {
      ...d,
      prepared: {
        on: true,
        yieldText: '162.654522 ml',
        shelfText: '14',
        parentId: '',
        role: '',
        ingredientId: '',
      },
    };
  };

  test('the computed properties are those of the engine vector for the same inputs', () => {
    const check = checkDraft(m, syrup(), false);
    expect(check.ok).toBe(true);
    const figures = check.prepared?.figures;
    expect(figures?.sugar).toBeCloseTo(vector.expected.sugar_g_per_100ml, 2);
    expect(figures?.abv).toBeCloseTo(vector.expected.abv_pct, 6);
    expect(figures?.acid).toBeCloseTo(vector.expected.acid_pct, 6);
  });

  test('the yield must be a volume; shelf life whole days', () => {
    const bad = {
      ...syrup(),
      prepared: { ...syrup().prepared, yieldText: '200 g', shelfText: '1.5' },
    };
    const check = checkDraft(m, bad, false);
    expect(check.ok).toBe(false);
    expect(check.prepared?.yieldError).toContain('volume');
    expect(check.prepared?.shelfError).toContain('whole days');
    const none = { ...syrup(), prepared: { ...syrup().prepared, yieldText: '' } };
    expect(checkDraft(m, none, false).blockers[0]).toContain('yield');
  });

  test('a prepared ingredient cannot contain itself', () => {
    const d = syrup();
    const self = { ...d, prepared: { ...d.prepared, ingredientId: 'water' } };
    expect(checkDraft(m, self, false).prepared?.blocker).toContain('itself');
  });
});

describe('saving', () => {
  test('a new drink is stored as the user id, with amounts as number and unit', async () => {
    const m = model();
    const local = await openFresh();
    const draft = filled(m);
    const check = checkDraft(m, draft, false);
    let n = 0;
    const saved = await saveDraft(draft, check, {
      local,
      saver: versionSaver(local, {
        at: '2026-11-17T10:00:00Z',
        newId: () => 'u-00000000-0000-4000-8000-0000000000aa',
      }),
      now: () => '2026-11-17T10:00:00Z',
      newId: () => `u-00000000-0000-4000-8000-00000000000${++n}`,
    });
    expect(saved.lineageId).toBe(saved.specId);
    const stored = await local.specs.get(saved.specId);
    expect(stored).toMatchObject({ name: 'Test', version: 1, status: 'draft', method: 'shake' });
    expect(stored?.['lines']).toHaveLength(3);
    expect(stored?.['createdAt']).toBe('2026-11-17T10:00:00Z');
    local.close();
  });

  test('an edit appends version 2 and keeps what the editor has no field for', async () => {
    const m = model();
    const local = await openFresh();
    const first = await saveDraft(filled(m), checkDraft(m, filled(m), false), {
      local,
      saver: versionSaver(local, { at: '2026-11-17T10:00:00Z', newId: () => 'never' }),
      now: () => '2026-11-17T10:00:00Z',
      newId: () => 'u-00000000-0000-4000-8000-000000000001',
    });
    const stored = (await local.specs.get(first.specId)) as unknown as SpecData;
    await local.specs.put({ ...stored, tags: ['sour'] } as never);
    const m2 = model(fixtureIngredients, [{ ...stored, tags: ['sour'] }]);
    let draft = draftFromSpec({ ...stored, tags: ['sour'] }, 'user', undefined);
    draft = { ...draft, name: 'Renamed', garnish: 'Lime wheel' };
    const second = await saveDraft(draft, checkDraft(m2, draft, false), {
      local,
      saver: versionSaver(local, {
        note: 'More lime',
        at: '2026-11-17T11:00:00Z',
        newId: () => 'u-00000000-0000-4000-8000-000000000002',
      }),
      now: () => '2026-11-17T11:00:00Z',
      newId: () => 'never',
    });
    expect(second.outcome).toBe('version');
    const all = await local.specs.versionsOf(first.lineageId);
    expect(all.map((v) => v.version)).toEqual([1, 2]);
    expect(all[0]).toMatchObject({ name: 'Test', tags: ['sour'] });
    expect(all[1]).toMatchObject({
      name: 'Renamed',
      garnish: 'Lime wheel',
      tags: ['sour'],
      note: 'More lime',
      parentId: first.specId,
      createdAt: '2026-11-17T10:00:00Z',
      updatedAt: '2026-11-17T11:00:00Z',
    });
    local.close();
  });

  test('a copy of a built-in drink is new, names its origin as parent and leaves the original alone', async () => {
    const m = model();
    const local = await openFresh();
    const builtIn = fixtureSpec('Daiquiri', [['rum', 60]], {
      id: 'daiquiri',
      lineageId: 'daiquiri',
    });
    const draft = draftFromSpec(builtIn, 'seed', undefined);
    expect(draft.target).toMatchObject({ kind: 'copy', fromId: 'daiquiri' });
    const saved = await saveDraft(draft, checkDraft(m, draft, false), {
      local,
      saver: versionSaver(local, {
        at: '2026-11-17T10:00:00Z',
        newId: () => 'u-00000000-0000-4000-8000-0000000000aa',
      }),
      now: () => '2026-11-17T10:00:00Z',
      newId: () => 'u-00000000-0000-4000-8000-000000000009',
    });
    expect(saved.specId.startsWith('u-')).toBe(true);
    expect(await local.specs.get(saved.specId)).toMatchObject({ parentId: 'daiquiri' });
    expect(await local.specs.get('daiquiri')).toBeUndefined();
    local.close();
  });

  test('a prepared draft writes the spec and its ingredient; the ingredient has yield and no computed properties', async () => {
    const m = model(vector.ingredients);
    const local = await openFresh();
    let d: Draft = { ...blankDraft(), name: 'Syrup' };
    for (const [ingredientId, amountText] of [
      ['sugar', '100 g'],
      ['water', '100 ml'],
    ] as const) {
      const added = emptyLine(d);
      d = updateLine(added.draft, added.key, (l) => ({ ...l, ingredientId, amountText }));
    }
    d = {
      ...d,
      prepared: {
        on: true,
        yieldText: '162.654522 ml',
        shelfText: '14',
        parentId: '',
        role: 'sweet',
        ingredientId: '',
      },
    };
    let n = 0;
    const saved = await saveDraft(d, checkDraft(m, d, false), {
      local,
      saver: versionSaver(local, {
        at: '2026-11-17T10:00:00Z',
        newId: () => 'u-00000000-0000-4000-8000-0000000000aa',
      }),
      now: () => '2026-11-17T10:00:00Z',
      newId: () => `u-00000000-0000-4000-8000-00000000001${++n}`,
    });
    const ingredient = (await local.ingredients.list())[0] as Ingredient;
    expect(ingredient).toMatchObject({
      name: 'Syrup',
      role: 'sweet',
      shelfLifeDays: 14,
      prepared: { specId: saved.specId, yield: { amount: 162.654522, unit: 'ml' } },
    });
    expect('abv' in ingredient || 'sugar' in ingredient).toBe(false);
    local.close();
  });
});
