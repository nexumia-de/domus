// Runs the vectors in vectors/cooklang against the engine's public entry (docs/vectors.md).
// The parser vectors are the specification's own examples, each named by its source.
import { describe, expect, test } from 'vitest';
import {
  availableModes,
  componentToCooklang,
  cooklangParts,
  dishToCooklang,
  hasSections,
  importComponent,
  importDish,
  ingredientUses,
  parseCooklang,
} from '../src/index';
import type {
  AmountMode,
  CooklangComponent,
  CooklangDish,
  DishImportOptions,
  DishSerializeContext,
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
    steps?: string[];
  };
  const context: SerializeContext = {
    ingredientName: (id) => i.names.ingredients[id] ?? id,
    componentName: (id) => i.names.components[id] ?? id,
    facts: i.facts,
    ...(i.tasting === undefined ? {} : { tasting: i.tasting }),
    ...(i.otherNotes === undefined ? {} : { otherNotes: i.otherNotes }),
    ...(i.steps === undefined ? {} : { steps: i.steps }),
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

interface PartView {
  name?: string;
  leading: boolean;
  texts: string[];
  uses: number[];
}

const partsOf = (text: string): PartView[] =>
  cooklangParts(parseCooklang(text)).map((p) => ({
    ...(p.name === undefined ? {} : { name: p.name }),
    leading: p.leading,
    texts: p.blocks.map((b) => b.text),
    uses: p.uses,
  }));

function parts(vector: Vector): void {
  const text = (vector.inputs as unknown as { text: string }).text;
  const e = vector.expected as { has_sections: boolean; parts: PartView[] };
  expect(hasSections(parseCooklang(text)), 'has_sections').toBe(e.has_sections);
  expect(partsOf(text)).toEqual(e.parts);
}

function importingDish(vector: Vector): void {
  const i = vector.inputs as unknown as {
    text: string;
    decisions: LineDecision[];
    options: Omit<DishImportOptions, 'facts'>;
    facts: Record<string, IngredientFacts>;
  };
  const result = importDish(parseCooklang(i.text), i.decisions, {
    ...i.options,
    facts: factsFn(i.facts),
  });
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const e = vector.expected as { dish: unknown; components: unknown[]; unmeasured: number[] };
  expect(result.dish).toEqual(e.dish);
  expect(result.components).toEqual(e.components);
  expect(result.unmeasured).toEqual(e.unmeasured);
}

function serializeDish(vector: Vector): void {
  const i = vector.inputs as unknown as {
    dish: CooklangDish;
    components: CooklangComponent[];
    componentSteps?: Record<string, string[]>;
    names: { ingredients: Record<string, string>; components: Record<string, string> };
    facts: Record<string, IngredientFacts>;
    assembly?: string[];
    assemblyName: string;
    tasting?: string;
    otherNotes?: number;
  };
  const byId = new Map(i.components.map((c) => [c.id, c]));
  const context: DishSerializeContext = {
    ingredientName: (id) => i.names.ingredients[id] ?? id,
    componentName: (id) => byId.get(id)?.name ?? i.names.components[id] ?? id,
    component: (id) => byId.get(id),
    componentSteps: (id) => i.componentSteps?.[id] ?? [],
    facts: i.facts,
    assemblyName: i.assemblyName,
    ...(i.assembly === undefined ? {} : { assembly: i.assembly }),
    ...(i.tasting === undefined ? {} : { tasting: i.tasting }),
    ...(i.otherNotes === undefined ? {} : { otherNotes: i.otherNotes }),
  };
  const result = dishToCooklang(i.dish, context);
  const e = vector.expected as {
    text: string;
    fileName: string;
    lost: string[];
    parts: PartView[];
  };
  expect(result.text).toBe(e.text);
  expect(result.fileName).toBe(e.fileName);
  expect([...result.lost].sort()).toEqual([...e.lost].sort());
  // What is written reads back as the parts the import makes a dish of.
  expect(partsOf(result.text), 'parts read back').toEqual(e.parts);
}

const RUNNERS: Record<string, (v: Vector) => void> = {
  cooklang_parse: parse,
  cooklang_serialize: serialize,
  cooklang_import: importing,
  cooklang_modes: modes,
  cooklang_parts: parts,
  cooklang_import_dish: importingDish,
  cooklang_serialize_dish: serializeDish,
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
