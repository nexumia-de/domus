// Reads the engine's component vectors from disk (not through the engine) and turns their
// inline components into the notebook the view logic reads.
import { readFileSync } from 'node:fs';
import type { Component } from '@culina/engine';
import type { ComponentRecord, Notebook } from '../src/records';

export interface ComponentVector {
  id: string;
  inputs: Record<string, unknown> & { components?: Component[]; component?: Component };
  expected?: Record<string, unknown>;
  error_code?: string;
  error_detail?: Record<string, unknown>;
  tolerance: number;
}

export const readComponentVector = (id: string): ComponentVector =>
  JSON.parse(
    readFileSync(new URL(`../../engine/vectors/components/${id}.json`, import.meta.url), 'utf8'),
  ) as ComponentVector;

const record = (c: Component): ComponentRecord => ({
  ...c,
  name: c.id,
  version: { family: c.id, date: '2026-11-18' },
});

/** A notebook of the vector's components; names are the ids, no facts, no ingredient yields. */
export const notebookOf = (components: readonly Component[]): Notebook => ({
  components: components.map(record),
  facts: {},
  ingredientName: (id) => id,
  ingredientYields: () => undefined,
});

/** The vector's own components (a single `component` counts as a list of one). */
export const vectorNotebook = (vector: ComponentVector): Notebook =>
  notebookOf(
    vector.inputs.components ?? (vector.inputs.component ? [vector.inputs.component] : []),
  );

export const componentOf = (nb: Notebook, id: string): ComponentRecord => {
  const found = nb.components.find((c) => c.id === id);
  if (found === undefined) throw new Error(`no component ${id}`);
  return found;
};

export interface ExpectedRaw {
  ingredient_id: string;
  state?: string;
  g: number;
}

/** Expected raw ingredients summed by ingredient and state, as the view merges them. */
export const mergedExpected = (raw: readonly ExpectedRaw[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const r of raw) {
    const key = r.state === undefined ? r.ingredient_id : `${r.ingredient_id}/${r.state}`;
    out[key] = (out[key] ?? 0) + r.g;
  }
  return out;
};
