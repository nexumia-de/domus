// Unit tests for the edge cases of components, yields and portions.
import { describe, expect, test } from 'vitest';
import {
  componentLineGrams,
  componentYield,
  expandComponent,
  flourAndWater,
  hydration,
  portionsFromYield,
  portionWeight,
  runGrams,
  toEdible,
  toPurchased,
  yieldFor,
} from '../src/index';
import type { Component, ComponentLine } from '../src/index';

const ing = (id: string, value?: number, unit: 'g' | 'ml' | 'count' = 'g'): ComponentLine => ({
  ref: { kind: 'ingredient', id },
  ...(value === undefined ? {} : { amount: { value, unit } }),
});
const sub = (id: string, value: number): ComponentLine => ({
  ref: { kind: 'component', id },
  amount: { value, unit: 'g' },
});
const yieldOf = (value: number) => ({ amount: { value, unit: 'g' as const }, source: 'synthetic' });

describe('componentLineGrams', () => {
  test('keeps line order, converts count and reports lines without amount', () => {
    const c: Component = {
      id: 'c',
      lines: [ing('egg', 2, 'count'), ing('salt'), ing('flour', 100)],
    };
    const r = componentLineGrams(c, { egg: { unitWeightG: 50 } });
    expect(r).toMatchObject({ ok: true, unmeasured: [1], inputG: 200 });
    expect(r.ok && r.lines.map((l) => [l.index, l.g])).toEqual([
      [0, 100],
      [2, 100],
    ]);
  });
  test('a percent line of a sub-component refers to the base mass', () => {
    const c: Component = {
      id: 'c',
      percentBase: 'flour',
      lines: [
        { ...ing('flour', 500), role: 'flour' },
        { ref: { kind: 'component', id: 'poolish' }, amount: { value: 20, unit: 'percent' } },
      ],
    };
    expect(componentLineGrams(c)).toMatchObject({ ok: true, inputG: 600 });
  });
  test('percent without base or with a base of 0 is an error', () => {
    const line: ComponentLine = { ...ing('water'), amount: { value: 70, unit: 'percent' } };
    expect(componentLineGrams({ id: 'c', lines: [line] })).toMatchObject({
      error: { code: 'no-percent-base', index: 0 },
    });
    const noBase: Component = { id: 'c', percentBase: 'flour', lines: [ing('salt', 5), line] };
    expect(componentLineGrams(noBase)).toMatchObject({ error: { code: 'no-percent-base' } });
  });
  test('a formula entirely in percent has no mass', () => {
    const c: Component = {
      id: 'c',
      percentBase: 'flour',
      lines: [{ ...ing('flour'), role: 'flour', amount: { value: 100, unit: 'percent' } }],
    };
    expect(componentLineGrams(c)).toMatchObject({ ok: false, error: { code: 'no-percent-base' } });
  });
  test('a line whose ingredient lacks a fact is listed and left out of the input', () => {
    const c: Component = {
      id: 'c',
      lines: [ing('tomato', 400), ing('onion', 1, 'count'), ing('oil', 10, 'ml')],
    };
    const r = componentLineGrams(c, { oil: { densityGPerMl: 0.9 } });
    expect(r).toMatchObject({
      ok: true,
      inputG: 409,
      unmeasured: [],
      unconverted: [{ index: 1, cause: { code: 'needs-unit-weight' } }],
    });
    expect(r.ok && r.lines.map((l) => l.index)).toEqual([0, 2]);
  });
  test('percent lines resting on a base line that lacks a fact are cannot-convert', () => {
    const c: Component = {
      id: 'c',
      percentBase: 'flour',
      lines: [
        { ...ing('flour', 500, 'ml'), role: 'flour' },
        { ...ing('water'), amount: { value: 70, unit: 'percent' } },
      ],
    };
    expect(componentLineGrams(c)).toMatchObject({
      ok: false,
      error: { code: 'cannot-convert', index: 0, cause: { code: 'needs-density' } },
    });
    // Without percent lines the same base line is only listed.
    expect(componentLineGrams({ ...c, lines: [c.lines[0] as ComponentLine] })).toMatchObject({
      ok: true,
      unconverted: [{ index: 0 }],
    });
  });
  test('invalid values are errors, not NaN', () => {
    expect(componentLineGrams({ id: 'c', lines: [ing('x', -1)] })).toMatchObject({
      error: { code: 'cannot-convert', cause: { code: 'invalid-value' } },
    });
    const zero: ComponentLine = { ...ing('x'), amount: { value: 0, unit: 'percent' } };
    expect(componentLineGrams({ id: 'c', lines: [zero] })).toMatchObject({
      error: { code: 'invalid-value', field: 'amount' },
    });
  });
});

describe('expandComponent', () => {
  const a: Component = { id: 'a', lines: [ing('x', 10), sub('b', 20)] };
  test('does not change its input and reports an unknown start id', () => {
    const before = JSON.stringify([a]);
    expect(expandComponent([a], 'nope')).toMatchObject({ error: { code: 'unknown-component' } });
    expect(JSON.stringify([a])).toBe(before);
  });
  test('a yield that is not a mass is invalid, not guessed', () => {
    const b = {
      id: 'b',
      lines: [ing('y', 5)],
      yield: { amount: { value: 5, unit: 'ml' }, source: 's' },
    };
    const r = expandComponent([a, b as unknown as Component], 'a');
    expect(r).toMatchObject({ error: { code: 'invalid-value', componentId: 'b', field: 'yield' } });
  });
  test('the same sub-component used twice is summed', () => {
    const top: Component = { id: 't', lines: [sub('s', 100), sub('s', 50)] };
    const s: Component = { id: 's', lines: [ing('x', 100)], yield: yieldOf(200) };
    const r = expandComponent([top, s], 't');
    expect(r).toMatchObject({ ok: true, rawG: 75, raw: [{ ingredientId: 'x', g: 75 }] });
  });
  test('errors inside a nested component carry its id', () => {
    const s: Component = { id: 's', lines: [ing('x', -100)], yield: yieldOf(100) };
    const r = expandComponent([{ id: 't', lines: [sub('s', 10)] }, s], 't');
    expect(r).toMatchObject({ error: { code: 'cannot-convert', componentId: 's', index: 0 } });
  });
  test('a line that lacks a fact inside a nested component is listed with its path, the rest expands', () => {
    const s: Component = {
      id: 's',
      lines: [ing('x', 100, 'ml'), ing('y', 100)],
      yield: yieldOf(100),
    };
    const r = expandComponent([{ id: 't', lines: [sub('s', 10)] }, s], 't');
    expect(r).toMatchObject({
      ok: true,
      rawG: 10,
      raw: [{ ingredientId: 'y', g: 10 }],
      unconverted: [{ path: ['t', 's'], index: 0, cause: { code: 'needs-density' } }],
      unweighed: [],
    });
  });
  test('without a yield a run is no-yield, or with withoutYield its input', () => {
    const s: Component = { id: 's', lines: [ing('x', 300), ing('egg', 1, 'count')] };
    const t: Component = { id: 't', lines: [sub('s', 100)] };
    expect(expandComponent([t, s], 't')).toMatchObject({ error: { code: 'no-yield' } });
    expect(expandComponent([t, s], 's', {}, { outputG: 150 })).toMatchObject({
      error: { code: 'no-yield', componentId: 's' },
    });
    // The egg has no piece weight: the run weighs its converted input, 300 g.
    expect(expandComponent([t, s], 't', {}, { withoutYield: 'input' })).toMatchObject({
      ok: true,
      raw: [{ ingredientId: 'x', g: 100 }],
      unweighed: ['s'],
    });
    expect(expandComponent([t, s], 's', {}, { outputG: 150, withoutYield: 'input' })).toMatchObject(
      { ok: true, factor: 0.5, raw: [{ ingredientId: 'x', g: 150 }], unweighed: ['s'] },
    );
    // A recorded yield is used as before and nothing is listed.
    const weighed = { ...s, yield: yieldOf(200) };
    expect(
      expandComponent([t, weighed], 's', {}, { outputG: 100, withoutYield: 'input' }),
    ).toMatchObject({ ok: true, factor: 0.5, unweighed: [] });
  });
  test('an expansion feeds hydration as the composition of a preferment', () => {
    const poolish: Component = {
      id: 'poolish',
      lines: [
        { ...ing('flour', 100), role: 'flour' },
        { ...ing('water', 100), role: 'water' },
      ],
      yield: yieldOf(200),
    };
    const dough: Component = {
      id: 'dough',
      lines: [
        { ...ing('flour', 500), role: 'flour' },
        { ...ing('water', 300), role: 'water' },
        sub('poolish', 200),
      ],
    };
    const raw = expandComponent([dough, poolish], 'poolish');
    if (!raw.ok) throw new Error('expand');
    const composition = flourAndWater(raw.raw);
    expect(composition).toEqual({ flourG: 100, waterG: 100 });
    const h = hydration([
      { id: 'flour', g: 500, role: 'flour' },
      { id: 'water', g: 300, role: 'water' },
      { id: 'poolish', g: 200, component: true, composition },
    ]);
    expect(h).toMatchObject({ ok: true, flourG: 600, waterG: 400 });
  });
});

describe('runGrams', () => {
  test('the recorded yield, else only on request the input, else nothing', () => {
    const c: Component = { id: 'c', lines: [ing('x', 10), ing('egg', 2, 'count')] };
    expect(runGrams(c)).toEqual({ ok: true, weighed: false });
    expect(runGrams(c, {}, 'input')).toEqual({ ok: true, g: 10, weighed: false });
    expect(runGrams(c, { egg: { unitWeightG: 50 } }, 'input')).toEqual({
      ok: true,
      g: 110,
      weighed: false,
    });
    expect(runGrams({ ...c, yield: yieldOf(90) }, {}, 'input')).toEqual({
      ok: true,
      g: 90,
      weighed: true,
    });
    expect(runGrams({ id: 'e', lines: [ing('x')] }, {}, 'input')).toEqual({
      ok: true,
      weighed: false,
    });
  });
});

describe('componentYield', () => {
  test('without a yield it is unknown, with a yield of zero input an error', () => {
    expect(componentYield({ id: 'c', lines: [ing('x', 10)] })).toEqual({
      ok: true,
      inputG: 10,
      unmeasured: [],
      unconverted: [],
      yield: { known: false },
    });
    expect(componentYield({ id: 'c', lines: [ing('x')] })).toMatchObject({
      yield: { known: false },
    });
  });
});

describe('yields', () => {
  const list = [{ state: 'raw' as const, percent: 80, source: 'synthetic' }];
  test('no recorded yield is unknown and never 100 percent', () => {
    expect(yieldFor(undefined, 'raw')).toEqual({ ok: true, known: false });
    expect(yieldFor(list, 'cooked')).toEqual({ ok: true, known: false });
    expect(toEdible(100, [], 'raw')).toEqual({
      ok: false,
      error: { code: 'unknown-yield', state: 'raw' },
    });
    expect(toPurchased(100, undefined, 'raw')).toMatchObject({ error: { code: 'unknown-yield' } });
  });
  test('rejects bad numbers', () => {
    expect(toEdible(Number.NaN, list, 'raw')).toMatchObject({ error: { field: 'g' } });
    expect(toEdible(Infinity, list, 'raw')).toMatchObject({ error: { code: 'invalid-value' } });
    expect(
      toEdible(10, [{ ...(list[0] as (typeof list)[number]), percent: Number.NaN }], 'raw'),
    ).toMatchObject({
      error: { field: 'percent' },
    });
    expect(toEdible(0, list, 'raw')).toEqual({ ok: true, g: 0 });
  });
});

describe('portions', () => {
  test('rejects non-finite and negative numbers', () => {
    expect(portionsFromYield(Infinity, 100)).toMatchObject({ error: { field: 'yieldG' } });
    expect(portionsFromYield(100, -5)).toMatchObject({ error: { field: 'portionG' } });
    expect(portionWeight(Number.NaN, 2)).toMatchObject({ error: { field: 'yieldG' } });
  });
  test('whole portions never exceed the true count', () => {
    expect(portionsFromYield(100, 100)).toMatchObject({ wholePortions: 1, remainderG: 0 });
    expect(portionsFromYield(99.9, 100)).toMatchObject({ wholePortions: 0 });
  });
});
