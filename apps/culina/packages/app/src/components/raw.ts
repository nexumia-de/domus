// The raw ingredients of a component "all the way down", scaled by an output weight or a factor.
import { expandComponent } from '@culina/engine';
import type { ExpandResult, FoodState, RawIngredient, UnmeasuredLine } from '@culina/engine';
import type { ComponentRecord, Notebook } from '../records';
import type { Entry } from '../shared/parse';
import { explain, refName } from './names';

export interface RawRow {
  ingredientId: string;
  name: string;
  state?: FoodState;
  g: number;
}

export interface UnmeasuredRow {
  name: string;
  /** The component the line is in. */
  where: string;
}

export type Scale =
  { kind: 'asWritten' } | { kind: 'output'; g: number } | { kind: 'factor'; value: number };

/**
 * What the cook entered: a wanted output weight when the component has an output weight, else a
 * factor. An entry that is not a number above 0 means the recipe as written.
 */
export const scaleFromEntry = (component: ComponentRecord, entry: Entry): Scale => {
  if (entry.kind !== 'ok') return { kind: 'asWritten' };
  return component.yield === undefined
    ? { kind: 'factor', value: entry.value }
    : { kind: 'output', g: entry.value };
};

/** Adds raw ingredients into rows by ingredient and state (roles are not told apart here). */
export const mergeRaw = (
  nb: Notebook,
  raw: readonly Pick<RawIngredient, 'ingredientId' | 'state' | 'g'>[],
): RawRow[] => {
  const rows = new Map<string, RawRow>();
  for (const r of raw) {
    const key = JSON.stringify([r.ingredientId, r.state]);
    const row = rows.get(key);
    if (row !== undefined) row.g += r.g;
    else {
      rows.set(key, {
        ingredientId: r.ingredientId,
        name: nb.ingredientName(r.ingredientId),
        ...(r.state === undefined ? {} : { state: r.state }),
        g: r.g,
      });
    }
  }
  return [...rows.values()];
};

/** The lines without an amount, with the component each is in. */
export const unmeasuredRows = (nb: Notebook, lines: readonly UnmeasuredLine[]): UnmeasuredRow[] =>
  lines.map((u) => ({
    name: refName(nb, u.ref),
    where: refName(nb, { kind: 'component', id: u.path[u.path.length - 1] ?? '' }),
  }));

export type RawView =
  | { ok: true; rows: RawRow[]; rawG: number; unmeasured: UnmeasuredRow[]; factor: number }
  | { ok: false; message: string };

/** Expands through the engine and applies the factor of a `factor` scale to the amounts. */
export const rawView = (nb: Notebook, component: ComponentRecord, scale: Scale): RawView => {
  const result: ExpandResult = expandComponent(
    nb.components,
    component.id,
    nb.facts,
    scale.kind === 'output' ? { outputG: scale.g } : {},
  );
  if (!result.ok) return { ok: false, message: explain(result.error, nb, component.percentBase) };
  const times = scale.kind === 'factor' ? scale.value : 1;
  const rows = mergeRaw(
    nb,
    result.raw.map((r) => ({ ...r, g: r.g * times })),
  );
  return {
    ok: true,
    rows,
    rawG: result.rawG * times,
    unmeasured: unmeasuredRows(nb, result.unmeasured),
    factor: result.factor * times,
  };
};
