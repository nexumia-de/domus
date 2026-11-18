// Property test: the raw amounts of a nested component add up to the input
// weight computed on the side, for 300 components built from a fixed seed.
import { describe, expect, test } from 'vitest';
import { componentLineGrams, expandComponent } from '../src/index';
import type { Component, ComponentLine } from '../src/index';

/** Linear congruential generator (Numerical Recipes constants); no Math.random. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** What the generator knows about a component, for the independent sum. */
interface Spec {
  id: string;
  /** Ingredient lines: grams. */
  leaves: number[];
  /** Sub-component lines: grams used and the sub-component's own spec. */
  subs: { g: number; spec: Spec }[];
  yieldG: number;
  inputG: number;
}

interface Built {
  components: Component[];
  spec: Spec;
}

const g = (value: number) => ({ value, unit: 'g' as const });

function build(
  rand: () => number,
  depth: number,
  lossless: boolean,
  counter: { n: number },
): Built {
  const id = `c${counter.n++}`;
  const leaves = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => 10 + rand() * 490);
  const subCount = depth === 0 ? 0 : Math.floor(rand() * 3);
  const subs: Spec['subs'] = [];
  const components: Component[] = [];
  for (let k = 0; k < subCount; k++) {
    const child = build(
      rand,
      depth - 1 - Math.floor(rand() * 2) * (depth > 1 ? 1 : 0),
      lossless,
      counter,
    );
    subs.push({ g: 5 + rand() * 295, spec: child.spec });
    components.push(...child.components);
  }
  const lines: ComponentLine[] = [
    ...leaves.map((v, k) => ({
      ref: { kind: 'ingredient' as const, id: `${id}-i${k}` },
      amount: g(v),
    })),
    ...subs.map((s) => ({ ref: { kind: 'component' as const, id: s.spec.id }, amount: g(s.g) })),
  ];
  const inputG = leaves.reduce((a, b) => a + b, 0) + subs.reduce((a, s) => a + s.g, 0);
  const yieldG = lossless ? inputG : inputG * (0.5 + rand() * 0.7);
  const component: Component = { id, lines, yield: { amount: g(yieldG), source: 'synthetic' } };
  return { components: [component, ...components], spec: { id, leaves, subs, yieldG, inputG } };
}

/** Sum over leaves of g x product of the use fractions along the path. */
function expectedRawG(spec: Spec, fractions: number[] = []): number {
  const product = fractions.reduce((a, b) => a * b, 1);
  const own = spec.leaves.reduce((sum, leaf) => sum + leaf * product, 0);
  return (
    own +
    spec.subs.reduce((sum, s) => sum + expectedRawG(s.spec, [...fractions, s.g / s.spec.yieldG]), 0)
  );
}

const RELATIVE_TOLERANCE = 1e-12;

describe('nested components', () => {
  test('rawG equals the input weight computed by path products', () => {
    const rand = lcg(20261118);
    for (let n = 0; n < 300; n++) {
      const { components, spec } = build(rand, 1 + (n % 4), false, { n: 0 });
      const result = expandComponent(components, spec.id);
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      const want = expectedRawG(spec);
      expect(Math.abs(result.rawG - want) / want, `case ${n}`).toBeLessThanOrEqual(
        RELATIVE_TOLERANCE,
      );
    }
  });

  test('without loss in any sub-component rawG equals the input of the top component', () => {
    const rand = lcg(42);
    let deepest = 0;
    for (let n = 0; n < 300; n++) {
      const { components, spec } = build(rand, 1 + (n % 4), true, { n: 0 });
      deepest = Math.max(deepest, components.length);
      const result = expandComponent(components, spec.id);
      const top = componentLineGrams(components[0] as Component);
      if (!result.ok || !top.ok) throw new Error(`case ${n}`);
      expect(Math.abs(result.rawG - top.inputG) / top.inputG, `case ${n}`).toBeLessThanOrEqual(
        RELATIVE_TOLERANCE,
      );
    }
    expect(deepest, 'some cases are nested').toBeGreaterThan(3);
  });

  test('an output weight scales every raw amount by outputG over the yield', () => {
    const rand = lcg(7);
    for (let n = 0; n < 50; n++) {
      const { components, spec } = build(rand, 3, false, { n: 0 });
      const result = expandComponent(components, spec.id, {}, { outputG: 2 * spec.yieldG });
      if (!result.ok) throw new Error(`case ${n}`);
      const want = 2 * expectedRawG(spec);
      expect(Math.abs(result.rawG - want) / want).toBeLessThanOrEqual(RELATIVE_TOLERANCE);
      expect(result.factor).toBe(2);
    }
  });
});
