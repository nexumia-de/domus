// `expandComponent` with `withoutAmount: 'run'` (a component named without an amount is one run of
// it per run of the component naming it, the rule a shipped dish is counted by) and with
// `rawBy: 'line'` (one raw entry per line). Used by the app for an own dish's totals, nutrition
// and characters (docs/engine-rules.md). Invented components; no shipped file is read.
import { describe, expect, test } from 'vitest';
import { expandComponent, runWeight } from '../src/index';
import type { Component } from '../src/index';

const g = (value: number) => ({ value, unit: 'g' as const });
const caramel: Component = {
  id: 'caramel',
  lines: [{ ref: { kind: 'ingredient', id: 'sugar' }, amount: g(100) }],
};
const custard: Component = {
  id: 'custard',
  lines: [
    { ref: { kind: 'ingredient', id: 'milk' }, amount: g(500) },
    { ref: { kind: 'ingredient', id: 'sugar' }, amount: g(80) },
    { ref: { kind: 'component', id: 'caramel' } },
  ],
};
const all = [caramel, custard];

describe('withoutAmount', () => {
  test('absent: the component named without an amount is listed as unmeasured, as before', () => {
    const run = expandComponent(all, 'custard');
    expect(run.ok && run.raw.map((r) => [r.ingredientId, r.g])).toEqual([
      ['milk', 500],
      ['sugar', 80],
    ]);
    expect(run.ok && run.unmeasured.map((u) => u.ref.id)).toEqual(['caramel']);
  });

  test("'run': one run of it per run, and nothing unmeasured", () => {
    const run = expandComponent(all, 'custard', {}, { withoutAmount: 'run' });
    expect(run.ok && run.raw.map((r) => [r.ingredientId, r.g])).toEqual([
      ['milk', 500],
      ['sugar', 180],
    ]);
    expect(run.ok && run.unmeasured).toEqual([]);
  });

  test("'run' scaled: 340 g of a custard taken as its input (680 g with the caramel) is half", () => {
    const run = expandComponent(
      all,
      'custard',
      {},
      { outputG: 340, withoutYield: 'input', withoutAmount: 'run' },
    );
    expect(run.ok && run.raw.map((r) => [r.ingredientId, r.g])).toEqual([
      ['milk', 250],
      ['sugar', 90],
    ]);
  });

  test("'run' on a loop is a cycle, not an endless walk", () => {
    const loop: Component = {
      ...caramel,
      lines: [...caramel.lines, { ref: { kind: 'component', id: 'custard' } }],
    };
    const run = expandComponent([loop, custard], 'custard', {}, { withoutAmount: 'run' });
    expect(run.ok ? 'ok' : run.error.code).toBe('cycle');
  });
});

test("rawBy 'line': one entry per line, where by default the sugar of both is one", () => {
  const options = { withoutAmount: 'run' } as const;
  const merged = expandComponent(all, 'custard', {}, options);
  const lines = expandComponent(all, 'custard', {}, { ...options, rawBy: 'line' });
  expect(merged.ok && merged.raw).toHaveLength(2);
  expect(lines.ok && lines.raw.map((r) => [r.ingredientId, r.g])).toEqual([
    ['milk', 500],
    ['sugar', 80],
    ['sugar', 100],
  ]);
});

// The weight every reader of a run on a dish's page divides by (the app's `dishParts`, `dishRaw`).
test('runWeight: what one run weighs, by the same rule as the expansion', () => {
  const run = runWeight(all, 'custard', {}, { withoutYield: 'input', withoutAmount: 'run' });
  expect(run.ok && run.g).toBe(680);
  // Controls: without the caramel's run, the input alone; without `withoutYield`, nothing assumed.
  expect(runWeight(all, 'custard', {}, { withoutYield: 'input' })).toEqual({ ok: true, g: 580 });
  const none = runWeight(all, 'custard');
  expect(none.ok ? 'ok' : none.error.code).toBe('no-yield');
});
