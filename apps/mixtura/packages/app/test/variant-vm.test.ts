/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known */
// Variant suggestions on the spec screen and the riff draft they start (#37).
import { ROOT_TEMPLATES, VARIANT_TEMPLATES } from '@mixtura/engine';
import { describe, expect, test } from 'vitest';
import { buildModel } from '../src/screens/browse/model';
import type { SpecData, Template } from '../src/screens/browse/types';
import { checkDraft } from '../src/screens/editor/check';
import { variantDraft } from '../src/screens/editor/draft';
import { suggestionFor, variantVMs } from '../src/screens/spec/variant-vm';
import { fixtureIngredients } from './browse-fixture';

const line = (ingredientId: string, amount: number) => ({ ingredientId, amount, unit: 'ml' });
const specs: SpecData[] = [
  {
    id: 'u-sour',
    lineageId: 'u-sour',
    version: 1,
    name: 'My Sour',
    method: 'shake',
    glass: 'coupe',
    status: 'draft',
    lines: [line('rum', 60), line('lime', 22.5), line('simple', 22.5)],
  },
  {
    id: 'u-nothing',
    lineageId: 'u-nothing',
    version: 1,
    name: 'Lime only',
    status: 'draft',
    lines: [line('lime', 30)],
  },
];
const built = buildModel({
  ingredients: fixtureIngredients,
  templates: ([...ROOT_TEMPLATES, ...VARIANT_TEMPLATES] as Template[]).map((value) => ({
    value,
    origin: 'seed' as const,
  })),
  specs: specs.map((value) => ({ value, origin: 'user' as const })),
  vocabulary: {
    methods: [{ id: 'shake', name: 'Shake' }],
    glasses: [{ id: 'coupe', name: 'Coupe' }],
  },
  seedVersion: 'test',
});
if (!built.ok) throw new Error(built.reason);
const model = built.model;
const spec = (id: string) => model.specById.get(id)!;

describe('variant suggestions', () => {
  test('a Daiquiri-like drink is offered the non-alcoholic sour, with what changes in words', () => {
    const { template, items } = variantVMs(model, spec('u-sour'), 'standard');
    expect(template).toBe('Daiquiri');
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.button).toBe('Start a Riff as Non-Alcoholic Sour');
    expect(item.href).toBe('#/drinks/u-sour/riff?variant=na-sour');
    expect(item.changes[0]).toBe(
      'Replaces Rum with a base of your choice: tea, tisane or a non-alcoholic distillate in place of the spirit.',
    );
    expect(item.changes[1]).toBe('Carries over Lime Juice and Simple Syrup.');
    expect(item.evidence).toBe('Slot ratios of the variant: assumption.');
  });

  test('nothing is said about the same taste', () => {
    const text = variantVMs(model, spec('u-sour'), 'standard')
      .items[0]!.changes.join(' ')
      .toLowerCase();
    expect(text).toContain('the taste and the balance change');
    expect(text).not.toMatch(/same taste|tastes the same|identical|just like/);
  });

  test('a drink that is already of the variant class is not offered it; none for no template', () => {
    expect(variantVMs(model, spec('u-sour'), 'none').items).toEqual([]);
    expect(variantVMs(model, spec('u-nothing'), 'standard').items).toEqual([]);
  });

  test('the riff draft carries the other lines, opens the base and sets the variant template', () => {
    const found = suggestionFor(model, spec('u-sour'), 'na-sour')!;
    const draft = variantDraft(spec('u-sour'), found.suggestion, found.template);
    expect(draft.templateId).toBe('na-sour');
    expect(draft.method).toBe('shake');
    expect(draft.glass).toBe('coupe');
    expect(draft.lines.map((l) => [l.ingredientId, l.role ?? ''])).toEqual([
      ['lime', ''],
      ['simple', ''],
      ['', 'base'],
    ]);
    expect(draft.target).toMatchObject({ kind: 'copy', fromId: 'u-sour', riff: true });
    // The empty base line is left out, never an error; the draft can be saved with the lines it has.
    const check = checkDraft(model, { ...draft, name: 'Sour without rum' }, false);
    expect(check.lines[2]!.status).toBe('empty');
  });

  test('an id that is not a variant of the drink gives nothing', () => {
    expect(suggestionFor(model, spec('u-sour'), 'na-highball')).toBeUndefined();
  });
});
