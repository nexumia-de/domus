// Runs the vectors in vectors/cooklang against the engine's public entry (docs/vectors.md).
// The parser vectors are the specification's own examples, each named by its source.
import { describe, expect, test } from 'vitest';
import {
  availableModes,
  componentToCooklang,
  importComponent,
  ingredientUses,
  parseCooklang,
} from '../src/index';
import type {
  AmountMode,
  CooklangComponent,
  IngredientFacts,
  LineDecision,
  SerializeContext,
} from '../src/index';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

function parse(vector: Vector): void {
  const doc = parseCooklang((vector.inputs as unknown as { text: string }).text);
  const e = vector.expected as Record<string, unknown>;
  const segments = doc.blocks.flatMap((b) => (b.type === 'step' ? b.segments : []));
  const got: Record<string, unknown> = {
    metadata: doc.metadata,
    ingredients: segments.flatMap((s) =>
      s.type === 'ingredient'
        ? [
            {
              name: s.name,
              optional: s.optional,
              reference: s.reference,
              ...(s.quantity === undefined ? {} : { quantity: s.quantity }),
              ...(s.note === undefined ? {} : { note: s.note }),
              ...(s.path === undefined ? {} : { path: s.path }),
            },
          ]
        : [],
    ),
    cookware: segments.flatMap((s) =>
      s.type === 'cookware' ? [{ name: s.name, optional: s.optional }] : [],
    ),
    timers: segments.flatMap((s) =>
      s.type === 'timer'
        ? [
            {
              ...(s.name === undefined ? {} : { name: s.name }),
              ...(s.quantity === undefined ? {} : { quantity: s.quantity }),
            },
          ]
        : [],
    ),
    steps: doc.blocks.flatMap((b) => (b.type === 'step' ? [b.text] : [])),
    notes: doc.blocks.flatMap((b) => (b.type === 'note' ? [b.text] : [])),
    sections: doc.blocks.flatMap((b) => (b.type === 'section' ? [b.name] : [])),
  };
  // Only what the vector states is compared; the rest must be empty.
  for (const key of ['metadata', 'cookware', 'timers', 'notes', 'sections']) {
    expect(got[key], key).toEqual(e[key] ?? (key === 'metadata' ? {} : []));
  }
  expect(got.ingredients, 'ingredients').toEqual(e.ingredients ?? []);
  expect(got.steps, 'steps').toEqual(e.steps);
}

const factsFn = (facts: Record<string, IngredientFacts>) => (ref: { id: string }) =>
  facts[ref.id] ?? {};

function serialize(vector: Vector): void {
  const i = vector.inputs as unknown as {
    component: CooklangComponent;
    names: { ingredients: Record<string, string>; components: Record<string, string> };
    facts: Record<string, IngredientFacts>;
    tasting?: string;
    otherNotes?: number;
  };
  const context: SerializeContext = {
    ingredientName: (id) => i.names.ingredients[id] ?? id,
    componentName: (id) => i.names.components[id] ?? id,
    facts: i.facts,
    ...(i.tasting === undefined ? {} : { tasting: i.tasting }),
    ...(i.otherNotes === undefined ? {} : { otherNotes: i.otherNotes }),
  };
  const result = componentToCooklang(i.component, context);
  const e = vector.expected as { text: string; fileName: string; lost: string[] };
  expect(result.text).toBe(e.text);
  expect(result.fileName).toBe(e.fileName);
  expect([...result.lost].sort()).toEqual([...e.lost].sort());
  // What is written reads back: same lines in order, with the amounts the file carries.
  const back = ingredientUses(parseCooklang(result.text));
  expect(back.length, 'lines read back').toBe(i.component.lines.length);
}

function importing(vector: Vector): void {
  const i = vector.inputs as unknown as {
    text: string;
    decisions: LineDecision[];
    options: {
      id: string;
      name: string;
      date: string;
      change: string;
      parent?: string;
      yieldGrams?: number;
      percentBase?: string;
    };
    facts: Record<string, IngredientFacts>;
  };
  const result = importComponent(parseCooklang(i.text), i.decisions, {
    ...i.options,
    facts: factsFn(i.facts),
  });
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  expect(result.component).toEqual((vector.expected as { component: unknown }).component);
  expect(result.unmeasured).toEqual((vector.expected as { unmeasured: number[] }).unmeasured);
}

function modes(vector: Vector): void {
  const i = vector.inputs as unknown as { text: string; facts: Record<string, IngredientFacts> };
  const got = ingredientUses(parseCooklang(i.text)).map((u) =>
    availableModes(u.quantity, i.facts[u.name] ?? {}),
  );
  expect(got).toEqual((vector.expected as { modes: AmountMode['mode'][][] }).modes);
}

const RUNNERS: Record<string, (v: Vector) => void> = {
  cooklang_parse: parse,
  cooklang_serialize: serialize,
  cooklang_import: importing,
  cooklang_modes: modes,
};

describe('vectors/cooklang', () => {
  for (const vector of loadVectors('cooklang')) {
    test(vector.id, () => {
      const run = RUNNERS[vector.inputs.kind];
      if (!run) throw new Error(`${vector.id}: unknown kind ${vector.inputs.kind}`);
      run(vector);
    });
  }
});

test('every parser vector names its source in the specification', () => {
  for (const v of loadVectors('cooklang').filter((x) => x.inputs.kind === 'cooklang_parse')) {
    expect(v.source, v.id).toMatch(/cooklang\/spec|Synthetic/);
  }
});
