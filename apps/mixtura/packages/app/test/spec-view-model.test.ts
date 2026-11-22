/* eslint-disable @typescript-eslint/no-non-null-assertion -- the fixtures are known; a missing entry should fail the test */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROOT_TEMPLATES } from '@mixtura/engine';
import { describe, expect, test } from 'vitest';
import { trackGeometry } from '../src/components/track';
import { buildModel } from '../src/screens/browse/model';
import type { Ingredient, SpecData, Template } from '../src/screens/browse/types';
import { amountText, listNames } from '../src/screens/spec/format';
import { initialSpecView } from '../src/screens/spec/session';
import { balanceVM } from '../src/screens/spec/balance-vm';
import { specVM, type SpecVM } from '../src/screens/spec/view-model';
import { seedModel } from './browse-fixture';

const dir = fileURLToPath(new URL('../../engine/vectors/classics/', import.meta.url));
const vectors = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('schema'))
  .map((f) => JSON.parse(readFileSync(dir + f, 'utf8')));

/** Words the balance panel must never use (docs/ui-strings.md, "Never used"). */
const VERDICTS =
  /\b(good|bad|wrong|balanced|perfect|score|grade|warning|error|too sweet|too sour)\b/i;

/**
 * The texts of the template tag and the balance panel as one string. The
 * drink's own name and its lines are the user's words and are not scanned.
 */
function texts(vm: SpecVM): string {
  const b = vm.balance;
  return [
    vm.tags[0]?.text ?? '',
    b.title,
    b.failure ?? '',
    ...b.figures.flatMap((f) => [
      f.name,
      f.valueText,
      f.positionShort ?? '',
      f.label,
      f.footer,
      f.missing ?? '',
    ]),
    b.volume ?? '',
    ...b.notCounted,
    ...b.more.flatMap((m) => [m.label, m.value, m.missing ?? '']),
    ...b.notes,
    b.unverified ?? '',
    ...b.details,
    vm.noTemplateNote ?? '',
  ].join('\n');
}

describe.each(vectors)('classic $id renders with the figures of its vector', (v) => {
  const ingredients = Object.entries(v.properties as Record<string, Record<string, unknown>>).map(
    ([id, p]) => ({ id, name: id, level: 'product', ...p }) as Ingredient,
  );
  const spec: SpecData = {
    id: v.id,
    lineageId: v.id,
    version: 1,
    name: v.name,
    status: 'draft',
    method: v.method,
    lines: v.lines,
  };
  const built = buildModel({
    ingredients,
    templates: ROOT_TEMPLATES.map((value) => ({
      value: value as Template,
      origin: 'seed' as const,
    })),
    specs: [{ value: spec, origin: 'seed' }],
    vocabulary: { methods: [], glasses: [] },
    seedVersion: 'vector',
  });
  if (!built.ok) throw new Error(built.reason);
  const vm = specVM(built.model, spec, 'metric');
  const decimals = { abv: 1, sugar: 1, acid: 2 } as const;

  test('figures', () => {
    const want = {
      abv: v.expected.abvPct,
      sugar: v.expected.sugarPer100Ml,
      acid: v.expected.acidPct,
    };
    for (const f of vm.balance.figures) {
      const expected = want[f.key];
      if (expected === 'unknown') {
        expect(f.known, f.key).toBe(false);
        expect(f.valueText).toBe('No figure');
        expect(f.missing).toContain('no ');
      } else {
        expect(f.known, f.key).toBe(true);
        expect(f.valueText.startsWith(Number(expected).toFixed(decimals[f.key])), f.key).toBe(true);
      }
    }
    expect(vm.balance.volume).toBe(
      `Volume after dilution ${Math.round(v.expected.volumeAfterMl)} ml`,
    );
  });

  test('template', () => {
    const tag = vm.tags[0]?.text;
    if (v.expected.templateId) {
      const name = ROOT_TEMPLATES.find((t) => t.id === v.expected.templateId)?.name;
      expect(tag).toBe(`${name} template (suggested)`);
    } else {
      expect(tag).toBe('No template');
      expect(vm.noTemplateNote).toBeTruthy();
    }
  });

  test('no verdict words', () => {
    expect(texts(vm)).not.toMatch(VERDICTS);
  });
});

describe('the seed drinks as the app shows them', () => {
  const model = seedModel();
  const view = (id: string) => specVM(model, model.byLineage.get(id)!.spec, 'metric');

  test('a drink with a template spaces its figures against the usual range', () => {
    const vm = view('daiquiri');
    expect(vm.tags[0]).toMatchObject({ text: 'Daiquiri template', href: '#/templates/daiquiri' });
    const abv = vm.balance.figures[0]!;
    expect(abv).toMatchObject({
      key: 'abv',
      status: 'within',
      assumed: true,
      footer: 'Assumed range 17.6–19.0 %',
    });
    // The range is an assumption: no position word, no claim of "within".
    expect(abv.positionShort).toBeUndefined();
    expect(abv.track?.within).toBe(true);
    expect(abv.label).toMatch(
      /^ABV 18\.\d %, assumed range 17\.6 to 19\.0 %, not checked against a source$/,
    );
    expect(vm.balance.title).toBe('Balance After Shaking');
    expect(vm.balance.unverified).toMatch(/not yet checked/);
    expect(vm.noTemplateNote).toBeUndefined();
  });

  test('acid is unknown and names the ingredients without a value', () => {
    const acid = view('daiquiri').balance.figures[2]!;
    expect(acid).toMatchObject({
      key: 'acid',
      known: false,
      status: 'unknown',
      valueText: 'No figure',
    });
    expect(acid.missing).toMatch(/^No figure: .* no acid value$/);
    expect(acid.missing).toContain('Light Rum');
    expect(acid.footer).toBe('Assumed range 0.75–0.82 %');
    expect(acid.track?.markLeft).toBeUndefined();
    expect(view('daiquiri').balance.more[1]).toMatchObject({
      label: 'Sugar to acid',
      value: 'No figure',
    });
  });

  test('a drink without a template is a normal state: values, no range, no band', () => {
    const none = model.drinks.find((d) => !d.spec.templateId && model.abvOf(d.spec) !== undefined)!;
    const vm = specVM(model, none.spec, 'metric');
    expect(vm.tags[0]?.text).toBe('No template');
    expect(vm.tags[0]?.href).toBeUndefined();
    expect(vm.noTemplateNote).toMatch(/none of the templates/);
    const abv = vm.balance.figures[0]!;
    expect(abv.known).toBe(true);
    expect(abv.status).toBe('unknown');
    expect(abv.positionShort).toBeUndefined();
    expect(abv.track).toBeUndefined();
    expect(abv.footer).toBe('No usual range for this drink');
    expect(vm.balance.unverified).toBeUndefined();
  });

  test('a drink with no method the model knows has no figures after dilution', () => {
    const odd = model.drinks.find((d) => !d.spec.method)!;
    const vm = specVM(model, odd.spec, 'metric');
    expect(vm.balance.volume).toBeUndefined();
    expect(vm.balance.figures.every((f) => f.valueText === 'No figure')).toBe(true);
    expect(vm.balance.figures[0]?.missing).toMatch(/no method/);
    expect(vm.balance.more[0]?.label).toBe('ABV before dilution');
  });

  test('method, glass and garnish rows appear only when the drink has them', () => {
    const vm = view('daiquiri');
    expect(vm.meta).toEqual([
      { label: 'Method', value: 'Shake' },
      { label: 'Glass', value: 'Coupe' },
    ]);
    const bare = model.drinks.find((d) => !d.spec.method && !d.spec.glass)!;
    expect(specVM(model, bare.spec, 'metric').meta).toEqual([]);
  });

  test('lines: amount in the display unit, role as a word, optional and substitutes', () => {
    const lines = view('daiquiri').lines;
    expect(lines[0]).toMatchObject({ amount: '60 ml', name: 'Light Rum', role: { label: 'Base' } });
    expect(specVM(model, model.byLineage.get('daiquiri')!.spec, 'us').lines[0]?.amount).toBe(
      '2 oz',
    );
    const withSub = model.drinks.find((d) => d.spec.lines.some((l) => l.substitutes?.length))!;
    expect(
      specVM(model, withSub.spec, 'metric').lines.some((l) => l.substitutes[0]?.startsWith('or ')),
    ).toBe(true);
    const optional = model.drinks.find((d) => d.spec.lines.some((l) => l.optional))!;
    expect(specVM(model, optional.spec, 'metric').lines.some((l) => l.optional)).toBe(true);
    const top = model.drinks.find((d) => d.spec.lines.some((l) => l.unit === 'top'))!;
    const topVM = specVM(model, top.spec, 'metric');
    expect(topVM.lines.some((l) => l.amount === 'Top')).toBe(true);
    expect(topVM.balance.notCounted.join(' ')).toMatch(/Top .*: no volume given/);
  });

  test('an ingredient that is not in the data keeps its id and is named as such', () => {
    const spec: SpecData = {
      ...model.byLineage.get('daiquiri')!.spec,
      lines: [{ ingredientId: 'gone', amount: 30, unit: 'ml' }],
    };
    const vm = specVM(model, spec, 'metric');
    expect(vm.lines[0]).toMatchObject({ name: 'Unknown ingredient', known: false });
    expect(vm.lines[0]?.note).toContain('gone');
  });

  test('no screen text of any seed drink uses a verdict word, and none says a figure is 0 when unknown', () => {
    for (const drink of model.drinks) {
      const vm = specVM(model, drink.spec, 'metric');
      expect(texts(vm), drink.spec.name).not.toMatch(VERDICTS);
      for (const f of vm.balance.figures) {
        if (!f.known) expect(f.valueText).toBe('No figure');
      }
    }
  });
});

describe('position words need evidence better than an assumption', () => {
  const model = seedModel();
  const daiquiri = model.templateById.get('daiquiri')!;
  const spec = model.byLineage.get('daiquiri')!.spec;
  const panel = (evidence: 'verified' | 'secondary' | 'derived' | 'assumption' | undefined) => {
    const template = { ...daiquiri, usual: { ...daiquiri.usual!, evidence } };
    return balanceVM(model.balanceOf(spec), spec.method, template, model.ingredientName);
  };

  test.each(['verified', 'secondary', 'derived'] as const)(
    '%s: position word and "Usual range"',
    (e) => {
      const abv = panel(e).figures[0]!;
      expect(abv).toMatchObject({ assumed: false, positionShort: 'Within' });
      expect(abv.footer).toBe('Usual range 17.6–19.0 %');
      expect(abv.label).toMatch(/within the usual range$/);
    },
  );

  test.each(['assumption', undefined] as const)('%s: assumed range, no position word', (e) => {
    for (const f of panel(e).figures.filter((x) => x.track)) {
      expect(f.assumed).toBe(true);
      expect(f.positionShort).toBeUndefined();
      expect(f.footer).toMatch(/^Assumed range /);
      expect(f.label).toMatch(/assumed range/);
    }
  });

  test('no seed drink shows a position word while every template range is an assumption', () => {
    for (const drink of model.drinks) {
      const vm = specVM(model, drink.spec, 'metric', { origin: drink.origin });
      for (const f of vm.balance.figures) expect(f.positionShort).toBeUndefined();
    }
  });
});

describe('lines not counted in the figures and the what-if volume of a top', () => {
  const model = seedModel();
  const top = model.drinks.find(
    (d) =>
      d.spec.lines.some((l) => l.unit === 'top') && !d.spec.lines.some((l) => l.unit === 'whole'),
  )!;
  const topIndex = top.spec.lines.findIndex((l) => l.unit === 'top');
  const withEgg = model.byLineage.get('apple-amaretto-sour')!;

  test('a top without a volume is listed with its reason and offers Add Volume', () => {
    const vm = specVM(model, top.spec, 'metric', { origin: 'seed' });
    expect(vm.balance.notCounted.length).toBeGreaterThan(0);
    expect(vm.lines[topIndex]?.top).toEqual({ state: 'none', editing: false });
  });

  test('a counted line without a known volume is listed and shown as entered', () => {
    const vm = specVM(model, withEgg.spec, 'metric', { origin: 'seed' });
    expect(vm.lines.at(-1)?.amount).toBe('1 whole');
    expect(vm.balance.notCounted).toEqual(['1 whole Egg White: no volume known per unit']);
  });

  test('every line counted: nothing is listed', () => {
    const vm = specVM(model, model.byLineage.get('daiquiri')!.spec, 'metric');
    expect(vm.balance.notCounted).toEqual([]);
  });

  test('a what-if volume is counted in the figures, the spec is not changed', () => {
    const before = JSON.stringify(top.spec);
    const plain = specVM(model, top.spec, 'metric');
    const view = { ...initialSpecView, lineage: top.spec.lineageId, topMl: { [topIndex]: 90 } };
    const what = specVM(model, top.spec, 'metric', { view });
    expect(what.lines[topIndex]?.amount).toBe('Top, 90 ml');
    expect(what.lines[topIndex]?.top).toMatchObject({ state: 'what-if', fieldValue: '90 ml' });
    expect(what.balance.notCounted.length).toBe(plain.balance.notCounted.length - 1);
    expect(what.balance.volume).not.toBe(plain.balance.volume);
    expect(JSON.stringify(top.spec)).toBe(before);
  });

  test('a stored topMl is shown and counted, with no what-if controls', () => {
    const spec = {
      ...top.spec,
      lines: top.spec.lines.map((l) => (l.unit === 'top' ? { ...l, topMl: 60 } : l)),
    };
    const vm = specVM(model, spec, 'metric');
    expect(vm.lines[topIndex]).toMatchObject({ amount: 'Top, 60 ml', top: { state: 'stored' } });
  });
});

describe('seed and user drinks', () => {
  const model = seedModel();
  const spec = model.byLineage.get('daiquiri')!.spec;
  test('a built-in drink shows where it comes from, not a version and a status', () => {
    const tags = specVM(model, spec, 'metric', { origin: 'seed' }).tags.map((t) => t.text);
    expect(tags).toContain('Built-in');
    expect(tags.join('|')).not.toMatch(/Version|Draft/);
  });
  test('a user drink shows its version and status', () => {
    const tags = specVM(model, spec, 'metric', { origin: 'user' }).tags.map((t) => t.text);
    expect(tags).toEqual(expect.arrayContaining(['Version 1', 'Draft']));
    expect(tags).not.toContain('Built-in');
  });
});

describe('amount text and helpers', () => {
  test('ranges, unit systems and the top line', () => {
    expect(amountText({ amount: 45, amountMax: 60, unit: 'ml' }, 'metric')).toBe('45–60 ml');
    expect(amountText({ amount: 1.5, unit: 'oz_us' }, 'metric')).toBe('45 ml');
    expect(amountText({ amount: 1.5, unit: 'oz_us' }, 'us')).toBe('1½ oz');
    expect(amountText({ amount: 2, unit: 'dash' }, 'metric')).toBe('2 dashes');
    expect(amountText({ amount: 1, unit: 'top' }, 'metric')).toBe('Top');
  });

  test('lists of names', () => {
    expect(listNames(['A'])).toBe('A');
    expect(listNames(['A', 'B', 'C'])).toBe('A, B and C');
    expect(listNames(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A, B, C, D and 2 more');
  });
});

describe('where a value sits on the track', () => {
  const range = { min: 10, max: 20 };
  test('the band is the middle third', () => {
    const g = trackGeometry(range);
    expect(g.bandLeft).toBeCloseTo(33.33, 1);
    expect(g.bandWidth).toBeCloseTo(33.33, 1);
    expect(g.markLeft).toBeUndefined();
  });
  test('inside, below, above and beyond the scale', () => {
    expect(trackGeometry(range, 15)).toMatchObject({ markLeft: 50, within: true });
    expect(trackGeometry(range, 10).within).toBe(true);
    expect(trackGeometry(range, 8)).toMatchObject({ within: false });
    expect(trackGeometry(range, 8).markLeft).toBeLessThan(33.3);
    expect(trackGeometry(range, 22).markLeft).toBeGreaterThan(66.7);
    expect(trackGeometry(range, -50).markLeft).toBe(0);
    expect(trackGeometry(range, 500).markLeft).toBe(100);
  });
  test('a range of no width still draws', () => {
    const g = trackGeometry({ min: 0, max: 0 }, 0);
    expect(Number.isFinite(g.bandLeft) && Number.isFinite(g.markLeft ?? 0)).toBe(true);
  });
});
