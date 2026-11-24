// Which lines of a dish lack, read from the finder's report of the dish (`dishReport`,
// `classicReport`), never judged again: without the list package, so that a screen can say how
// many lack without carrying the list's rules and data (the dish page's offer, roadmap goal 11).
// A line lacks when it is `missing` or `short`; a line that is there by substitution, through a
// group or a whole, an optional line and the kitchen's water do not (water always reports
// `have`). Pure.
import type { HouseholdMeasure } from '../amounts/round';
import type { Amount, UnitId } from '../amounts/types';
import type { ComponentRef } from '../components/types';
import type { MakeableLineReport } from '../makeable/types';

/** The finder's report of one dish: its name and a report per line. */
export interface LackingReport {
  name: string;
  lines: readonly MakeableLineReport[];
  /** The names of lines without a catalogue ingredient (a classic's `wanted` lines). */
  notInCatalogue?: readonly string[];
  /** Per top-level line (by `index`), the spoon or cup the source wrote (`classicReport`). */
  measures?: readonly (HouseholdMeasure | undefined)[];
}

/** One catalogue ingredient that lacks, with what lacks of it per unit (none when unknown). */
export interface LackingItem {
  /** An ingredient (`kind: 'ingredient'`). */
  ref: ComponentRef;
  amounts: { amount: Amount; measure?: HouseholdMeasure }[];
}

export interface LackingItems {
  /** One per catalogue ingredient that lacks, in the order of the dish's lines. */
  items: LackingItem[];
  /**
   * Names without a catalogue ingredient: the lines the catalogue lacks and a component that
   * lacks without lines of its own to look at.
   */
  free: string[];
}

/** The amount to buy: for `missing` the need, for `short` the need less what is there. */
function lackingAmount(line: MakeableLineReport): Amount | undefined {
  const need = line.need;
  if (need === undefined) return undefined;
  if (line.status === 'missing') return need;
  if (line.have === undefined || line.have.unit !== need.unit) return undefined;
  return { value: need.value - line.have.value, unit: need.unit };
}

const lacks = (line: MakeableLineReport): boolean =>
  !line.optional && (line.status === 'missing' || line.status === 'short');

/**
 * What a dish lacks: one item per catalogue ingredient (amounts of one ingredient in one unit
 * added up, other units beside them), and the free names. A sub-component that could not be made
 * gives the lines it lacks.
 * @param nameOf - The name of a component without lines to look at, for `free`.
 */
export function lackingItems(
  report: LackingReport,
  nameOf: (ref: ComponentRef) => string,
): LackingItems {
  const byId = new Map<
    string,
    {
      ref: ComponentRef;
      amounts: Map<UnitId, { value: number; measure?: HouseholdMeasure }>;
    }
  >();
  const free: string[] = [...(report.notInCatalogue ?? [])];
  const walk = (lines: readonly MakeableLineReport[], top: boolean): void => {
    for (const line of lines) {
      if (!lacks(line)) continue;
      if (line.parts !== undefined && line.parts.length > 0) {
        walk(line.parts, false);
        continue;
      }
      const ref = line.ref;
      if (ref === undefined) continue;
      if (ref.kind !== 'ingredient') {
        free.push(nameOf(ref));
        continue;
      }
      const known = byId.get(ref.id) ?? { ref, amounts: new Map() };
      const amount = lackingAmount(line);
      if (amount !== undefined) {
        const was = known.amounts.get(amount.unit);
        const measure = was?.measure ?? (top ? report.measures?.[line.index] : undefined);
        known.amounts.set(amount.unit, {
          value: (was?.value ?? 0) + amount.value,
          ...(measure === undefined ? {} : { measure }),
        });
      }
      byId.set(ref.id, known);
    }
  };
  walk(report.lines, true);
  const items = [...byId.values()].map(({ ref, amounts }): LackingItem => ({
    ref,
    amounts: [...amounts].map(([unit, { value, measure }]) => ({
      amount: { value, unit },
      ...(measure === undefined ? {} : { measure }),
    })),
  }));
  return { items, free: [...new Set(free)] };
}
