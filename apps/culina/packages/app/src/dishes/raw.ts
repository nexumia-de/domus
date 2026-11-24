// The raw ingredients of a whole dish for a number of portions: each component slot expanded
// by the engine for its total weight, ingredient slots added as they are. A component without a
// weighed output is taken as weighing what goes into it, the rule the cook screen uses too
// (`withoutYield: 'input'`), and named in `unweighed`. A component slot without an amount stands for
// one run of the component at the dish's stored portions (`runsWithoutAmount`), and a component
// named without an amount inside another for one run of it (`withoutAmount: 'run'`): the rule a
// shipped dish is counted by. The character rules read the same expansion (`expandSlot`).
import { expandComponent } from '@culina/engine';
import type { ExpandResult, RawIngredient, UnmeasuredLine } from '@culina/engine';
import { cannotScale, explain, refName } from '../components/names';
import { mergeRaw, unmeasuredRows } from '../components/raw';
import type { RawRow, UnmeasuredRow } from '../components/raw';
import type { Notebook } from '../records';
import type { SlotMass, SlotRow } from './slots';
import { KITCHEN_WATER } from '../characters/table';

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

/**
 * The options every reader of a run on a dish's page expands and weighs by (`dishParts` too): a
 * run without a yield weighs what goes in, a component named without an amount is one run, and a
 * component named by mass whose run holds kitchen water (mostly poured away) has no known weight.
 */
export const RUN_RULE = {
  withoutYield: 'input',
  withoutAmount: 'run',
  notWeighedByLine: KITCHEN_WATER,
} as const;

/**
 * The raw ingredients a component slot stands for: its total weight expanded by the component's
 * yield (else one run taken as what goes in), or, without an amount, its runs of the recipe as
 * written. `undefined` for an ingredient slot and for a slot with neither (a problem of its own).
 * For the amounts a cook weighs out (`'amounts'`, the default) a run whose weight cannot be known
 * soundly is an error, said where the slot is listed. For the character rules (`'characters'`)
 * the lines are one raw entry each, as a shipped dish counts them, and kitchen water does not stop
 * a run from being weighed: only shares are read there, and a shipped dish counts that run too.
 */
export const expandSlot = (
  nb: Pick<Notebook, 'components' | 'facts'>,
  slot: SlotMass,
  purpose: 'amounts' | 'characters' = 'amounts',
): ExpandResult | undefined => {
  if (slot.kind !== 'component') return undefined;
  const options =
    purpose === 'amounts'
      ? RUN_RULE
      : ({ withoutYield: 'input', withoutAmount: 'run', rawBy: 'line' } as const);
  if (slot.totalG !== undefined) {
    return expandComponent(nb.components, slot.id, nb.facts, { ...options, outputG: slot.totalG });
  }
  if (slot.runs === undefined) return undefined;
  const times = slot.runs;
  const run = expandComponent(nb.components, slot.id, nb.facts, options);
  if (!run.ok) return run;
  const raw = run.raw.map((r) => ({ ...r, g: r.g * times }));
  return { ...run, raw, rawG: run.rawG * times, factor: times };
};

/** Sums the slots that have a total weight; a slot that cannot be expanded is listed, not fatal. */
export const dishRaw = (nb: Notebook, slots: readonly SlotRow[]): DishRaw => {
  const raw: Pick<RawIngredient, 'ingredientId' | 'state' | 'g'>[] = [];
  const unmeasuredLines: UnmeasuredLine[] = [];
  const unconvertedLines: UnmeasuredLine[] = [];
  const unweighed: string[] = [];
  const skipped: Skipped[] = [];
  for (const slot of slots) {
    if (slot.kind === 'ingredient' && slot.totalG !== undefined) {
      raw.push({ ingredientId: slot.id, g: slot.totalG });
      continue;
    }
    const result = expandSlot(nb, slot);
    if (result === undefined) {
      if (slot.problem !== undefined) skipped.push({ name: slot.name, why: slot.problem });
      continue;
    }
    if (!result.ok) {
      const { error } = result;
      const why =
        error.code === 'no-yield' && error.componentId !== undefined
          ? cannotScale(nb, error.componentId)
          : explain(error, nb);
      skipped.push({ name: slot.name, why });
    } else {
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
