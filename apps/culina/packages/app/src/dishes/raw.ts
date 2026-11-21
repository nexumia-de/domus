// The raw ingredients of a whole dish for a number of portions: each component slot expanded
// by the engine for its total weight, ingredient slots added as they are. A component without a
// weighed output is taken as weighing what goes into it, the rule the cook screen uses too
// (`withoutYield: 'input'`), and named in `unweighed`.
import { expandComponent } from '@culina/engine';
import type { RawIngredient, UnmeasuredLine } from '@culina/engine';
import { explain, refName } from '../components/names';
import { mergeRaw, unmeasuredRows } from '../components/raw';
import type { RawRow, UnmeasuredRow } from '../components/raw';
import type { Notebook } from '../records';
import type { SlotRow } from './slots';

export interface Skipped {
  name: string;
  why: string;
}

export interface DishRaw {
  rows: RawRow[];
  rawG: number;
  unmeasured: UnmeasuredRow[];
  /** Lines whose amount cannot be weighed (no density or piece weight); not in the rows. */
  unconverted: UnmeasuredRow[];
  /** Names of the components taken as weighing what goes into them. */
  unweighed: string[];
  /** Slots that could not be added up, each with its reason; the rest is still added. */
  skipped: Skipped[];
}

/** Sums the slots that have a total weight; a slot that cannot be expanded is listed, not fatal. */
export const dishRaw = (nb: Notebook, slots: readonly SlotRow[]): DishRaw => {
  const raw: Pick<RawIngredient, 'ingredientId' | 'state' | 'g'>[] = [];
  const unmeasuredLines: UnmeasuredLine[] = [];
  const unconvertedLines: UnmeasuredLine[] = [];
  const unweighed: string[] = [];
  const skipped: Skipped[] = [];
  for (const slot of slots) {
    if (slot.totalG === undefined) {
      if (slot.problem !== undefined) skipped.push({ name: slot.name, why: slot.problem });
      continue;
    }
    if (slot.kind === 'ingredient') {
      raw.push({ ingredientId: slot.id, g: slot.totalG });
      continue;
    }
    const result = expandComponent(nb.components, slot.id, nb.facts, {
      outputG: slot.totalG,
      withoutYield: 'input',
    });
    if (!result.ok) skipped.push({ name: slot.name, why: explain(result.error, nb) });
    else {
      raw.push(...result.raw);
      unmeasuredLines.push(...result.unmeasured);
      unconvertedLines.push(...result.unconverted);
      for (const id of result.unweighed) {
        const name = refName(nb, { kind: 'component', id });
        if (!unweighed.includes(name)) unweighed.push(name);
      }
    }
  }
  const rows = mergeRaw(nb, raw);
  return {
    rows,
    rawG: rows.reduce((sum, r) => sum + r.g, 0),
    unmeasured: unmeasuredRows(nb, unmeasuredLines),
    unconverted: unmeasuredRows(nb, unconvertedLines),
    unweighed,
    skipped,
  };
};
