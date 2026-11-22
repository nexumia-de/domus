import { expect, test } from 'vitest';
import { componentYield, expandComponent } from '@culina/engine';
import { portionsView, yieldView } from '../src/components/figures';
import { lineRows } from '../src/components/lines';
import { rawView, scaleFromEntry, type RawRow } from '../src/components/raw';
import { getComponent, notebook } from '../src/demo';
import { parseEntry } from '../src/shared/parse';
import { strings } from '../src/strings';
import {
  componentOf,
  mergedExpected,
  notebookOf,
  readComponentVector,
  vectorNotebook,
  type ExpectedRaw,
} from './component-vectors';
import { must } from './must';

const byKey = (rows: readonly RawRow[]): Record<string, number> =>
  Object.fromEntries(
    rows.map((r) => [r.state === undefined ? r.ingredientId : `${r.ingredientId}/${r.state}`, r.g]),
  );

const expectClose = (actual: Record<string, number>, expected: Record<string, number>): void => {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [key, g] of Object.entries(expected)) expect(actual[key], key).toBeCloseTo(g, 6);
};

const ok = <T extends { ok: boolean }>(view: T): Extract<T, { ok: true }> => {
  expect(view.ok).toBe(true);
  return view as Extract<T, { ok: true }>;
};

test('three-level nesting: the raw list equals the engine vector (the nested yield rule)', () => {
  const vector = readComponentVector('expand-three-level');
  const nb = vectorNotebook(vector);
  const view = ok(rawView(nb, componentOf(nb, 'dish'), { kind: 'asWritten' }));
  const expected = vector.expected as { raw: ExpectedRaw[]; raw_g: number };
  expectClose(byKey(view.rows), mergedExpected(expected.raw));
  expect(view.rawG).toBeCloseTo(expected.raw_g, 6);
  expect(view.rows.map((r) => r.ingredientId)).toEqual(expected.raw.map((r) => r.ingredient_id));
});

test('a fraction of a sub-component: 200 g of a sauce that yields 800 g takes a quarter', () => {
  const vector = readComponentVector('expand-fractional-sub-component');
  const nb = vectorNotebook(vector);
  const view = ok(rawView(nb, componentOf(nb, 'pasta'), { kind: 'asWritten' }));
  expectClose(byKey(view.rows), mergedExpected((vector.expected as { raw: ExpectedRaw[] }).raw));
  expect(byKey(view.rows)['tomato']).toBeCloseTo(175, 6);
});

test('a wanted output weight scales the nested expansion like the vector', () => {
  const vector = readComponentVector('expand-output-g-nested');
  const nb = vectorNotebook(vector);
  const entry = parseEntry(String(vector.inputs['output_g']));
  const scale = scaleFromEntry(componentOf(nb, 'pie'), entry);
  expect(scale).toEqual({ kind: 'output', g: 400 });
  const view = ok(rawView(nb, componentOf(nb, 'pie'), scale));
  const expected = vector.expected as { raw: ExpectedRaw[]; factor: number };
  expectClose(byKey(view.rows), mergedExpected(expected.raw));
  expect(view.factor).toBeCloseTo(expected.factor, 6);
});

test('a component without an output weight is scaled by a factor, nothing else changes', () => {
  const vector = readComponentVector('expand-percent-lines');
  const nb = vectorNotebook(vector);
  const dough = componentOf(nb, 'dough');
  const scale = scaleFromEntry(dough, parseEntry('2,5'));
  expect(scale).toEqual({ kind: 'factor', value: 2.5 });
  const view = ok(rawView(nb, dough, scale));
  const expected = (vector.expected as { raw: ExpectedRaw[] }).raw;
  expectClose(
    byKey(view.rows),
    Object.fromEntries(Object.entries(mergedExpected(expected)).map(([k, g]) => [k, g * 2.5])),
  );
  expect(view.factor).toBe(2.5);
  expect(scaleFromEntry(dough, parseEntry('abc'))).toEqual({ kind: 'asWritten' });
  expect(scaleFromEntry(dough, parseEntry(''))).toEqual({ kind: 'asWritten' });
});

test('percent lines: grams and percent of the base role match the vector', () => {
  const vector = readComponentVector('expand-percent-lines');
  const nb = vectorNotebook(vector);
  const view = ok(lineRows(nb, componentOf(nb, 'dough')));
  expect(view.baseRole).toBe('flour');
  const expected = (vector.expected as { raw: ExpectedRaw[] }).raw;
  expect(view.rows.map((r) => r.g)).toEqual(expected.map((r) => r.g));
  expect(view.rows.map((r) => r.percent)).toEqual([60, 40, 75, 2]);
});

test('aggregation: the same ingredient in two roles is one row per state', () => {
  const vector = readComponentVector('expand-aggregates-by-state-and-role');
  const nb = vectorNotebook(vector);
  const view = ok(rawView(nb, componentOf(nb, 'mix'), { kind: 'asWritten' }));
  expectClose(byKey(view.rows), { 'onion/raw': 170, 'onion/cooked': 80 });
});

test('lines without an amount: "to taste" in the lines, listed apart in the raw list', () => {
  const vector = readComponentVector('expand-unmeasured-nested');
  const nb = vectorNotebook(vector);
  const dish = componentOf(nb, 'dish');
  const lines = ok(lineRows(nb, dish));
  expect(lines.rows.map((r) => r.g)).toEqual([300, 250, undefined]);
  const raw = ok(rawView(nb, dish, { kind: 'asWritten' }));
  expect(raw.unmeasured).toEqual([
    { name: 'parsley', where: 'dish' },
    { name: 'salt', where: 'sauce' },
  ]);
  expectClose(byKey(raw.rows), { pasta: 300, tomato: 200 });
});

test('yield figures equal the vectors: loss, gain, unknown', () => {
  for (const id of ['yield-loss', 'yield-gain', 'yield-unknown']) {
    const vector = readComponentVector(id);
    const nb = vectorNotebook(vector);
    const component = must(nb.components[0]);
    const view = ok(yieldView(nb, component));
    const expected = vector.expected as Record<string, number | boolean>;
    expect(view.inputG, id).toBeCloseTo(expected['input_g'] as number, 6);
    if (expected['known'] === false) {
      expect(view.output, id).toEqual({ known: false });
    } else {
      const out = view.output;
      expect(out.known).toBe(true);
      if (!out.known) continue;
      expect(out.outputG).toBeCloseTo(expected['output_g'] as number, 6);
      expect(out.lossG).toBeCloseTo(expected['loss_g'] as number, 6);
      expect(out.yieldPct).toBeCloseTo(expected['yield_pct'] as number, 6);
    }
  }
});

test('portions equal the vectors', () => {
  for (const id of ['portions-remainder', 'portions-exact', 'portions-binary-noise']) {
    const vector = readComponentVector(id);
    const inputs = vector.inputs as unknown as { yield_g: number; portion_g: number };
    const view = portionsView(inputs.yield_g, parseEntry(String(inputs.portion_g)));
    const expected = vector.expected as Record<string, number>;
    expect(view.kind, id).toBe('ok');
    if (view.kind !== 'ok') continue;
    expect(view.portions, id).toBeCloseTo(expected['portions'] as number, 5);
    expect(view.whole, id).toBe(expected['whole_portions']);
    expect(view.remainderG, id).toBeCloseTo(expected['remainder_g'] as number, 6);
  }
  expect(portionsView(1000, parseEntry('')).kind).toBe('none');
  expect(portionsView(1000, parseEntry('x')).kind).toBe('invalid');
});

test('engine errors never throw: one quiet sentence says what cannot be shown', () => {
  const cases: [string, string, RegExp][] = [
    ['expand-error-cycle', 'a', /circle: a, b, a/],
    ['expand-error-unknown-component', '', /not in the notebook/],
    ['expand-error-no-yield-nested', 'dish', /output of sauce is not weighed yet/],
    [
      'expand-error-cannot-convert-percent-base',
      'dough',
      /flour is given in a unit that needs a density/,
    ],
    ['expand-error-no-percent-base', '', /Lines in percent need a base/],
  ];
  for (const [id, start, pattern] of cases) {
    const vector = readComponentVector(id);
    const nb = vectorNotebook(vector);
    const top = componentOf(nb, start === '' ? String(vector.inputs['id']) : start);
    const view = rawView(nb, top, { kind: 'asWritten' });
    expect(view.ok, id).toBe(false);
    if (view.ok) continue;
    expect(view.message, id).toMatch(pattern);
    expect(view.message, id).not.toMatch(/\b(error|invalid|failed|wrong|missing)\b/i);
    expect(typeof lineRows(nb, top).ok).toBe('boolean');
    expect(typeof yieldView(nb, top).ok).toBe('boolean');
  }
});

test('one line that cannot be weighed carries its own note; the other lines, the input and the raw list show', () => {
  const vector = readComponentVector('expand-unconverted-count-nested');
  const nb = vectorNotebook(vector);
  const sauce = componentOf(nb, 'sauce');
  const lines = ok(lineRows(nb, sauce));
  expect(lines.rows.map((r) => [r.name, r.g, r.unconverted])).toEqual([
    ['tomato', 400, undefined],
    ['onion', undefined, { written: { value: 1, unit: 'count' }, lacks: 'needs-unit-weight' }],
    ['butter', 30, undefined],
  ]);
  const figures = ok(yieldView(nb, sauce));
  expect([figures.inputG, figures.unweighable, figures.partial]).toEqual([430, true, false]);
  const raw = ok(rawView(nb, componentOf(nb, 'plate'), { kind: 'asWritten' }));
  expect(raw.rawG).toBeCloseTo(415, 9);
  expect(raw.unconverted).toEqual([{ name: 'onion', where: 'sauce' }]);
});

test('a component output asked of one that has no output weight says so in plain words', () => {
  const vector = readComponentVector('expand-error-no-yield-output-g');
  const nb = vectorNotebook(vector);
  const view = rawView(nb, componentOf(nb, 'sauce'), { kind: 'output', g: 400 });
  expect(view).toEqual({ ok: false, message: strings.notebook.problem.noYield('sauce') });
});

test('demo data: lines, yield and raw list equal direct engine calls', () => {
  const nb = notebook();
  const sauce = must(getComponent('example-pan-sauce'));
  const direct = expandComponent(nb.components, sauce.id, nb.facts, { outputG: 200 });
  expect(direct.ok).toBe(true);
  const view = ok(rawView(nb, sauce, { kind: 'output', g: 200 }));
  if (direct.ok) {
    expect(view.rawG).toBeCloseTo(direct.rawG, 9);
    expect(view.factor).toBeCloseTo(0.5, 9);
    for (const r of direct.raw) {
      expect(view.rows.find((row) => row.ingredientId === r.ingredientId)?.g).toBeCloseTo(r.g, 9);
    }
  }
  const figures = componentYield(sauce, nb.facts);
  const shown = ok(yieldView(nb, sauce));
  expect(figures.ok && figures.inputG).toBe(shown.inputG);
});

test('the edible-portion note appears only where a yield is recorded for the line state', () => {
  const nb = notebook();
  const base = must(getComponent('example-soft-vegetable-base'));
  const rows = ok(lineRows(nb, base)).rows;
  const named = Object.fromEntries(rows.map((r) => [r.id, r.purchasedG]));
  expect(named['onion']).toBeCloseTo(250, 9); // 200 g raw at an example 80 percent
  expect(named['carrot']).toBeCloseTo(100 / 0.9, 9);
  expect(named['celery']).toBeUndefined(); // no recorded yield: nothing is assumed
  expect(named['butter']).toBeUndefined(); // no state on the line
});

test('demo data: a component with no output weight shows the neutral state, the rest renders', () => {
  const nb = notebook();
  const oil = must(getComponent('example-herb-oil'));
  const figures = ok(yieldView(nb, oil));
  expect(figures.output).toEqual({ known: false });
  expect(figures.partial).toBe(true);
  expect(strings.components.outputUnknown).toBe('Output not weighed yet');
  expect(ok(lineRows(nb, oil)).rows.at(-1)?.g).toBeUndefined();
  expect(ok(rawView(nb, oil, { kind: 'factor', value: 2 })).rawG).toBeCloseTo(240, 9);
});

test('a broken notebook (cycle, unknown component) gives sentences, not exceptions', () => {
  const broken = notebookOf([
    {
      id: 'a',
      lines: [{ ref: { kind: 'component', id: 'b' }, amount: { value: 10, unit: 'g' } }],
      yield: { amount: { value: 10, unit: 'g' }, source: 'x' },
    },
    {
      id: 'b',
      lines: [{ ref: { kind: 'component', id: 'a' }, amount: { value: 10, unit: 'g' } }],
      yield: { amount: { value: 10, unit: 'g' }, source: 'x' },
    },
    {
      id: 'c',
      lines: [{ ref: { kind: 'component', id: 'gone' }, amount: { value: 10, unit: 'g' } }],
    },
  ]);
  const a = componentOf(broken, 'a');
  expect(ok(lineRows(broken, a)).rows[0]?.name).toBe('b');
  const cycle = rawView(broken, a, { kind: 'asWritten' });
  expect(!cycle.ok && cycle.message).toMatch(/circle: a, b, a/);
  const c = componentOf(broken, 'c');
  const unknown = rawView(broken, c, { kind: 'asWritten' });
  expect(!unknown.ok && unknown.message).toBe(strings.notebook.problem.unknownComponent('gone'));
});
