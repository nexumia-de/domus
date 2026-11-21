// Runs every vector in vectors/components against the engine (docs/vectors.md).
// Inputs are snake_case at the top (`output_g`, `facts_by_ingredient`) and the
// stored shape inside `components`, `component` and `yields`.
import { describe, expect, test } from 'vitest';
import {
  componentLineGrams,
  componentYield,
  convertComponentLines,
  expandComponent,
  portionsFromYield,
  portionWeight,
  toEdible,
  toPurchased,
  yieldFor,
} from '../src/index';
import type { Component, ComponentLine, FactsByIngredient, IngredientYield } from '../src/index';
import { expectError, loadVectors, near, nearRecord } from './vector-files';
import type { Vector } from './vector-files';

const vectors = loadVectors('components');

type Fields = Record<string, number>;

function ok<T extends { ok: boolean }>(result: T, vector: Vector): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify((result as never)['error'])}`);
  return result as Extract<T, { ok: true }>;
}

function expand(vector: Vector): void {
  const i = vector.inputs;
  const options = {
    ...(i.output_g === undefined ? {} : { outputG: i.output_g as number }),
    ...(i.without_yield === undefined ? {} : { withoutYield: i.without_yield as 'input' }),
  };
  const result = expandComponent(
    i.components as Component[],
    i.id as string,
    (i.facts_by_ingredient ?? {}) as FactsByIngredient,
    options,
  );
  if (vector.error_code !== undefined) return expectError(result, vector);
  const got = ok(result, vector);
  const e = vector.expected as {
    raw: { ingredient_id: string; state?: string; role?: string; g: number }[];
    raw_g: number;
    factor: number;
    unmeasured: { path: string[]; index: number; ref_id: string }[];
    unconverted?: { path: string[]; index: number; ref_id: string; cause: string }[];
    unweighed?: string[];
  };
  expect(got.raw.length, 'raw length').toBe(e.raw.length);
  e.raw.forEach((want, n) => {
    const have = got.raw[n] as (typeof got.raw)[number];
    expect(have.ingredientId, `raw[${n}]`).toBe(want.ingredient_id);
    expect(have.state, `raw[${n}].state`).toBe(want.state);
    expect(have.role, `raw[${n}].role`).toBe(want.role);
    near(have.g, want.g, vector.tolerance, `raw[${n}].g`);
  });
  near(got.rawG, e.raw_g, vector.tolerance, 'raw_g');
  near(got.factor, e.factor, vector.tolerance, 'factor');
  expect(
    got.unmeasured.map((u) => ({ path: u.path, index: u.index, ref_id: u.ref.id })),
    'unmeasured',
  ).toEqual(e.unmeasured);
  expect(
    got.unconverted.map((u) => ({
      path: u.path,
      index: u.index,
      ref_id: u.ref.id,
      cause: u.cause.code,
    })),
    'unconverted',
  ).toEqual(e.unconverted ?? []);
  expect(got.unweighed, 'unweighed').toEqual(e.unweighed ?? []);
}

function yields(vector: Vector): void {
  const result = componentYield(
    vector.inputs.component as Component,
    (vector.inputs.facts_by_ingredient ?? {}) as FactsByIngredient,
  );
  if (vector.error_code !== undefined) return expectError(result, vector);
  const got = ok(result, vector);
  const e = vector.expected as Fields & {
    known: boolean;
    unmeasured?: number[];
    unconverted?: number[];
  };
  near(got.inputG, e.input_g as number, vector.tolerance, 'input_g');
  expect(got.yield.known, 'known').toBe(e.known);
  expect(got.unmeasured, 'unmeasured').toEqual(e.unmeasured ?? []);
  expect(
    got.unconverted.map((u) => u.index),
    'unconverted',
  ).toEqual(e.unconverted ?? []);
  if (got.yield.known) {
    near(got.yield.outputG, e.output_g as number, vector.tolerance, 'output_g');
    near(got.yield.lossG, e.loss_g as number, vector.tolerance, 'loss_g');
    near(got.yield.yieldPct, e.yield_pct as number, vector.tolerance, 'yield_pct');
  }
}

function edible(vector: Vector): void {
  const i = vector.inputs;
  const list = i.yields as IngredientYield[] | undefined;
  const state = i.state as IngredientYield['state'];
  const g = i.g as number;
  const e = (vector.expected ?? {}) as Record<string, number | boolean>;
  const failing = vector.error_code !== undefined;
  switch (i.operation) {
    case 'lookup': {
      const got = ok(yieldFor(list, state), vector);
      expect(got.known).toBe(e.known);
      if (got.known) near(got.percent, e.percent as number, vector.tolerance, 'percent');
      return;
    }
    case 'to_edible':
    case 'to_purchased': {
      const result = (i.operation === 'to_edible' ? toEdible : toPurchased)(g, list, state);
      if (failing) return expectError(result, vector);
      return near(ok(result, vector).g, e.g as number, vector.tolerance, 'g');
    }
    case 'round_trip': {
      const forth = ok(toEdible(g, list, state), vector);
      near(forth.g, e.edible_g as number, vector.tolerance, 'edible_g');
      near(
        ok(toPurchased(forth.g, list, state), vector).g,
        e.purchased_g as number,
        vector.tolerance,
        'purchased_g',
      );
      return;
    }
    default:
      throw new Error(`${vector.id}: unknown operation ${String(i.operation)}`);
  }
}

function portions(vector: Vector): void {
  const i = vector.inputs;
  const e = (vector.expected ?? {}) as Fields;
  if (i.operation === 'portion_weight') {
    const result = portionWeight(i.yield_g as number, i.count as number);
    if (vector.error_code !== undefined) return expectError(result, vector);
    return near(ok(result, vector).portionG, e.portion_g as number, vector.tolerance, 'portion_g');
  }
  if (i.operation !== 'portions_from_yield') {
    throw new Error(`${vector.id}: unknown operation ${String(i.operation)}`);
  }
  const result = portionsFromYield(i.yield_g as number, i.portion_g as number);
  if (vector.error_code !== undefined) return expectError(result, vector);
  const got = ok(result, vector);
  nearRecord(
    { portions: got.portions, whole: got.wholePortions, remainder: got.remainderG },
    {
      portions: e.portions as number,
      whole: e.whole_portions as number,
      remainder: e.remainder_g as number,
    },
    vector.tolerance,
    'portions',
  );
}

function convertLines(vector: Vector): void {
  const i = vector.inputs;
  const component = i.component as Component;
  const facts = (i.facts_by_ingredient ?? {}) as FactsByIngredient;
  const to = i.to as 'weight' | 'percent';
  const result = convertComponentLines(component, to, facts);
  if (vector.error_code !== undefined) return expectError(result, vector);
  const got = ok(result, vector);
  const e = vector.expected as { lines: { amount?: { value: number; unit: string } }[] };
  expect(got.lines.length, 'lines').toBe(e.lines.length);
  e.lines.forEach((want, n) => {
    const have = (got.lines[n] as ComponentLine).amount;
    expect(have?.unit, `lines[${n}].unit`).toBe(want.amount?.unit);
    if (want.amount !== undefined)
      near(have?.value ?? NaN, want.amount.value, vector.tolerance, `lines[${n}]`);
  });
  // The grams do not change by the conversion.
  const before = ok(componentLineGrams(component, facts), vector);
  const after = ok(componentLineGrams({ ...component, lines: got.lines }, facts), vector);
  before.lines.forEach((line, n) =>
    near((after.lines[n] as { g: number }).g, line.g, 1e-6, `grams of line ${n}`),
  );
}

function run(vector: Vector): void {
  switch (vector.inputs.kind) {
    case 'expand_component':
      return expand(vector);
    case 'component_yield':
      return yields(vector);
    case 'edible_portion':
      return edible(vector);
    case 'portions':
      return portions(vector);
    case 'convert_lines':
      return convertLines(vector);
    default:
      throw new Error(`${vector.id}: unknown vector kind ${String(vector.inputs.kind)}`);
  }
}

describe('components vectors', () => {
  test.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, vector) => run(vector));
  test('unknown kinds are rejected', () => {
    const bogus: Vector = {
      id: 'x',
      description: '',
      inputs: { kind: 'nope' },
      tolerance: 0,
      source: 's',
    };
    expect(() => run(bogus)).toThrow(/unknown vector kind/);
  });
});
