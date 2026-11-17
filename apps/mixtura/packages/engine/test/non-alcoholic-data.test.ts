/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any -- data files are untyped JSON read by the test */
// Mixtura's own non-alcoholic data (data/mixtura, data/template-variants,
// data/alcohol-thresholds.json): schemas, evidence of every value, the merge
// with the converted seed, the nominal example drinks (docs/non-alcoholic.md,
// docs/seed-data.md#mixturas-own-additions).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  buildTree,
  classifyAlcohol,
  computeBalance,
  matchSpec,
  resolveProperty,
  ROOT_TEMPLATES,
  VARIANT_TEMPLATES,
  type Ingredient,
} from '../src/index';
import { makeAjv } from './schema-helpers';
import { engineRoot, read, seed } from './seed-data';

const own = `${engineRoot}data/mixtura/`;
const ingFile = read<{ attribution: any; evidence: Record<string, any>; ingredients: any[] }>(
  `${own}ingredients.json`,
);
const specFile = read<{ attribution: any; specs: any[] }>(`${own}specs.json`);
const ajv = makeAjv();
const merged = [...seed.ingredients.ingredients, ...ingFile.ingredients] as Ingredient[];
const built = buildTree(merged);
if (!built.ok) throw new Error(built.errors.map((e) => e.message).join('; '));
const tree = built.tree;
const PROPS = ['role', 'abv', 'sugar', 'acid', 'shelfLifeDays', 'substitutionClass'] as const;
const STATUS = ['read', 'secondary', 'derived', 'assumption, unverified'];

describe('ingredients', () => {
  test('validate, merge with the seed without a clash and form a tree', () => {
    const check = ajv.getSchema('urn:mixtura:ingredient')!;
    for (const i of ingFile.ingredients)
      expect(check(i), `${i.id} ${JSON.stringify(check.errors)}`).toBe(true);
    expect(tree.ids.length).toBe(seed.ingredients.ingredients.length + ingFile.ingredients.length);
  });

  test('records are sorted by id, name Mixtura as source and carry no Bar Assistant commit', () => {
    const ids = ingFile.ingredients.map((i) => i.id);
    expect(ids).toEqual([...ids].sort());
    for (const i of ingFile.ingredients) {
      expect(i.source.name).toBe('Mixtura');
      expect(i.source.licence).toBe('AGPL-3.0-or-later');
    }
    expect(ingFile.attribution.source).toBe('Mixtura');
  });

  test('every role, abv, sugar, acid, shelf-life and class value has an evidence status and a source; the assumed list matches', () => {
    for (const i of ingFile.ingredients) {
      const ev = ingFile.evidence[i.id] ?? {};
      const present = PROPS.filter((p) => i[p] !== undefined);
      expect(Object.keys(ev).sort(), i.id).toEqual([...present].sort());
      for (const p of present) {
        expect(STATUS, `${i.id}.${p}`).toContain(ev[p].status);
        expect(ev[p].source, `${i.id}.${p}`).toMatch(/docs\/non-alcoholic\.md/);
      }
      const assumed = present.filter((p) => ev[p].status === 'assumption, unverified').sort();
      expect(i.assumed ?? [], i.id).toEqual(assumed);
    }
    expect(Object.keys(ingFile.evidence).every((id) => tree.byId.has(id))).toBe(true);
  });

  test('no value without a source in docs/non-alcoholic.md: shelf life is absent, acid only where the table gives 0, labels and ferments have no ABV', () => {
    for (const i of ingFile.ingredients) {
      expect(i.shelfLifeDays, i.id).toBeUndefined();
      // the class table gives acid 0 only for the texture agents; every other acid is left to the maker
      if (i.id !== 'texture-agent') expect(i.acid, i.id).toBeUndefined();
    }
    for (const id of [
      'non-alcoholic-spirit',
      'non-alcoholic-aperitif',
      'bitters-non-alcoholic',
      'ferment',
      'kombucha',
      'water-kefir',
      'tepache',
    ]) {
      expect(resolveProperty(tree, id, 'abv').value, id).toBeUndefined();
    }
    for (const id of [
      'tea-tisane',
      'black-tea-brewed',
      'verjus',
      'shrub-vinegar',
      'acid-solution',
      'texture-agent',
      'glycerin',
    ]) {
      expect(resolveProperty(tree, id, 'abv').value, id).toBe(0);
    }
  });

  test('roles of the classes follow the table of docs/non-alcoholic.md', () => {
    const role = (id: string) => resolveProperty(tree, id, 'role').value;
    expect(role('non-alcoholic-spirit')).toBe('base');
    expect(role('non-alcoholic-aperitif')).toBe('bitter');
    expect(role('black-tea-brewed')).toBe('base');
    expect(role('white-verjus')).toBe('sour');
    expect(role('shrub-vinegar')).toBe('sour');
    expect(role('kombucha')).toBe('lengthener');
    expect(role('citric-acid-solution')).toBe('sour');
    expect(role('bitters-non-alcoholic')).toBe('bitter');
    expect(role('glycerin')).toBe('texture');
  });

  test('no data from TheCocktailDB or FlavorDB', () => {
    for (const f of readdirSync(own)) {
      expect(readFileSync(`${own}${f}`, 'utf8')).not.toMatch(/cocktaildb|flavordb/i);
    }
  });
});

describe('thresholds', () => {
  const data = read(`${engineRoot}data/alcohol-thresholds.json`);

  test('validate and hold the presets of docs/non-alcoholic.md', () => {
    const check = ajv.compile(read(`${engineRoot}data/alcohol-thresholds.schema.json`));
    expect(check(data), JSON.stringify(check.errors)).toBe(true);
    expect(data.presets.without.map((p: any) => [p.maxPct, p.bound])).toEqual([
      [0.5, 'below'],
      [0.05, 'upTo'],
      [0, 'upTo'],
    ]);
    expect(data.presets.low.map((p: any) => p.maxPct)).toEqual([1.2, 10]);
    expect(data.presets.low.find((p: any) => p.maxPct === 10).evidence).toBe(
      'assumption, unverified',
    );
    for (const group of [data.presets.without, data.presets.low]) {
      expect(group.map((p: any) => p.id)).toContain(
        data.default[group === data.presets.low ? 'low' : 'without'],
      );
    }
  });
});

describe('template variants', () => {
  const check = ajv.getSchema('urn:mixtura:template')!;
  const files = readdirSync(`${engineRoot}data/template-variants`).sort();

  test('four files, each validates and is a variant of a root template for none or low', () => {
    expect(files).toEqual([
      'low-stirred.json',
      'na-foamed.json',
      'na-highball.json',
      'na-sour.json',
    ]);
    expect(VARIANT_TEMPLATES.map((t) => t.id).sort()).toEqual(
      files.map((f) => f.replace('.json', '')),
    );
    for (const t of VARIANT_TEMPLATES) {
      expect(check(t), `${t.id} ${JSON.stringify(check.errors)}`).toBe(true);
      expect(
        ROOT_TEMPLATES.some((r) => r.id === t.parentId),
        t.id,
      ).toBe(true);
      expect(['none', 'low']).toContain(t.alcohol);
      expect(t.slotEvidence).toBe('assumption');
    }
  });

  test('every range has a source and is marked assumption; none of them is an ABV range', () => {
    for (const t of VARIANT_TEMPLATES) {
      if (!t.usual) continue;
      expect(t.usual.evidence, t.id).toBe('assumption');
      expect(t.source?.note, t.id).toContain('Assumption, unverified');
      expect(t.usual.abv, t.id).toBeUndefined();
    }
  });

  test('a variant of a root has no id that the root has and an alcohol field needs a parent', () => {
    const noParent = { ...VARIANT_TEMPLATES[0]!, parentId: undefined };
    expect(check(JSON.parse(JSON.stringify(noParent)))).toBe(false);
  });

  test('sugar and acid ranges are the nominal spec computed with f_high and f_low', () => {
    const t = buildTree([
      { id: 'tea', name: 'Tea', level: 'product', role: 'base', abv: 0, sugar: 0, acid: 0 },
      { id: 'lime', name: 'Lime', level: 'product', role: 'sour', abv: 0, sugar: 1.5, acid: 6 },
      {
        id: 'syrup',
        name: 'Syrup',
        level: 'product',
        role: 'sweet',
        abv: 0,
        sugar: 61.48,
        acid: 0,
      },
      {
        id: 'aquafaba',
        name: 'Aquafaba',
        level: 'product',
        role: 'texture',
        abv: 0,
        sugar: 0,
        acid: 0,
      },
      { id: 'soda', name: 'Soda', level: 'product', role: 'lengthener', abv: 0, sugar: 0, acid: 0 },
    ] as Ingredient[]);
    if (!t.ok) throw new Error('tree');
    const nominal: Record<string, [string, any[]]> = {
      'na-sour': [
        'shake',
        [
          ['tea', 60],
          ['lime', 22.5],
          ['syrup', 22.5],
        ],
      ],
      'na-foamed': [
        'shake',
        [
          ['tea', 60],
          ['syrup', 15],
          ['aquafaba', 45],
        ],
      ],
      'na-highball': [
        'build',
        [
          ['tea', 60],
          ['soda', 150],
        ],
      ],
    };
    for (const [id, [method, lines]] of Object.entries(nominal)) {
      const tpl = VARIANT_TEMPLATES.find((x) => x.id === id)!;
      const at = (bound: 'high' | 'low') => {
        const r = computeBalance(
          t.tree,
          {
            method,
            lines: lines.map(([ingredientId, amount]) => ({ ingredientId, amount, unit: 'ml' })),
          },
          { dilution: { bound } },
        );
        if (!r.ok || !r.value.after) throw new Error('balance');
        const a = r.value.after;
        return {
          sugar: (a.sugarPer100Ml as any).value as number,
          acid: (a.acidPct as any).value as number,
        };
      };
      const hi = at('high');
      const lo = at('low');
      expect(Math.abs(tpl.usual!.sugar!.min - hi.sugar), id).toBeLessThan(0.051);
      expect(Math.abs(tpl.usual!.sugar!.max - lo.sugar), id).toBeLessThan(0.051);
      expect(Math.abs(tpl.usual!.acid!.min - hi.acid), id).toBeLessThan(0.0051);
      expect(Math.abs(tpl.usual!.acid!.max - lo.acid), id).toBeLessThan(0.0051);
    }
  });
});

describe('nominal example drinks', () => {
  const check = ajv.getSchema('urn:mixtura:spec')!;

  test('few, labelled as nominal in name, tag and note, validate and resolve', () => {
    expect(specFile.specs.length).toBeLessThanOrEqual(6);
    const ids = specFile.specs.map((s) => s.id);
    expect(ids).toEqual([...ids].sort());
    for (const s of specFile.specs) {
      expect(check(s), `${s.id} ${JSON.stringify(check.errors)}`).toBe(true);
      expect(s.name).toMatch(/\(example\)$/);
      expect(s.tags).toContain('nominal-example');
      expect(s.notes).toMatch(/^Nominal example/);
      expect(s.source.name).toBe('Mixtura');
      expect(VARIANT_TEMPLATES.some((t) => t.id === s.templateId)).toBe(true);
      for (const l of s.lines)
        expect(tree.byId.has(l.ingredientId), `${s.id} ${l.ingredientId}`).toBe(true);
    }
  });

  test('each is tagged by its own variant when asked for its computed class', () => {
    const want: Record<string, string> = {
      'nominal-low-stirred': 'standard',
      'nominal-na-foamed': 'none',
      'nominal-na-highball': 'none',
      'nominal-na-sour': 'none',
    };
    for (const s of specFile.specs) {
      const bal = computeBalance(tree, { method: s.method, lines: s.lines });
      if (!bal.ok) throw new Error('balance');
      const cls = classifyAlcohol(bal.value, tree);
      expect(cls.class, s.id).toBe(want[s.id]);
      // the variant is offered for its own class; low-stirred is classified standard under the default line, so only the Martini applies there
      const asked = s.id === 'nominal-low-stirred' ? 'low' : cls.class;
      const r = matchSpec(
        tree,
        [...ROOT_TEMPLATES, ...VARIANT_TEMPLATES],
        { lines: s.lines },
        { alcohol: asked },
      );
      expect(r.chosen?.templateId, s.id).toBe(s.templateId);
    }
  });
});
