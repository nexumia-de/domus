// The batch sheet as data: a pre-diluted batch of the shown drink for the
// chosen number of servings, from the engine's `prediluted`. Derived every
// time, never stored. Unknowns stay "Unknown" (shelf life) and the sheet
// says which dilution it used (docs/screens-specs.md#servings-and-batch).

import {
  formatAmount,
  prediluted,
  type DisplaySystem,
  type IngredientTree,
  type UnitId,
} from '@mixtura/engine';
import { strings } from '../../strings';
import type { SpecLine } from '../browse/types';
import { listNames } from './format';

export interface BatchLineVM {
  amount: string;
  name: string;
  /** Said when the line is not in the totals or its rounding is worth knowing. */
  note?: string;
}

export interface BatchVM {
  title: string;
  lines: BatchLineVM[];
  rows: { label: string; value: string; note?: string }[];
  notes: string[];
  /** The batch could not be built: the reason, in words. */
  failure?: string;
}

const text = (value: number, unit: UnitId, system: DisplaySystem): string => {
  const f = formatAmount({ value, unit }, { system, precision: 'batch' });
  return f.ok ? f.value : `${value} ${unit}`;
};

export function batchVM(
  tree: IngredientTree,
  method: string | undefined,
  lines: readonly SpecLine[],
  servings: number,
  system: DisplaySystem,
  nameOf: (id: string) => string | undefined,
): BatchVM {
  const title = strings.batch.title(servings);
  const result = prediluted(tree, { method, lines }, servings, { system });
  if (!result.ok) {
    const first = result.errors[0];
    return {
      title,
      lines: [],
      rows: [],
      notes: [],
      failure:
        first?.code === 'no-dilution'
          ? strings.batch.noDilution
          : strings.batch.failed(first?.message ?? ''),
    };
  }
  const batch = result.value;
  const name = (id: string): string => nameOf(id) ?? id;
  const lineVMs = batch.lines.map((line): BatchLineVM => {
    const vm: BatchLineVM = {
      amount: text(line.rounded.value, line.rounded.unit, system),
      name: name(line.ingredientId),
    };
    if (line.roundingError === null) vm.note = strings.batch.noVolumeLine;
    else if (Math.abs(line.roundingError) >= 0.5) {
      const sign = line.roundingError > 0 ? '+' : '−';
      const unit = line.rounded.unit === 'g' ? 'g' : 'ml';
      vm.note = strings.batch.rounded(`${sign}${Math.abs(line.roundingError).toFixed(1)} ${unit}`);
    }
    return vm;
  });

  const shelf = batch.shelfLife;
  const rows: BatchVM['rows'] = [
    { label: strings.batch.water, value: text(batch.water.roundedMl, 'ml', system) },
    { label: strings.batch.total, value: text(batch.roundedTotalMl, 'ml', system) },
    { label: strings.batch.pour, value: text(batch.pourPerServingMl, 'ml', system) },
    {
      label: strings.batch.yield,
      value: strings.batch.yieldValue(Math.round(batch.roundedYieldServings * 10) / 10),
    },
    shelf.known
      ? {
          label: strings.batch.shelfLife,
          value: strings.batch.shelfDays(shelf.days, name(shelf.limitingId)),
        }
      : {
          label: strings.batch.shelfLife,
          value: strings.batch.unknown,
          note: strings.batch.shelfMissing(listNames(shelf.missingIds.map(name))),
        },
  ];

  const notes: string[] = [];
  const dilution = batch.perDrink.dilution;
  if (dilution?.method) {
    const basis =
      dilution.evidence === 'override'
        ? strings.balance.dilutionBasis.override
        : strings.balance.evidence[dilution.evidence];
    const gerund =
      (strings.balance.gerunds as Record<string, string | undefined>)[dilution.method] ??
      dilution.method;
    notes.push(
      strings.batch.dilutionBasis(gerund.toLowerCase(), Math.round(dilution.fraction * 100), basis),
    );
  }
  if (batch.servedSeparately.length) {
    notes.push(
      strings.batch.atTheGlass(listNames(batch.servedSeparately.map((l) => name(l.ingredientId)))),
    );
  }
  if (batch.perDrink.excluded.length) {
    notes.push(
      strings.batch.notCounted(listNames(batch.perDrink.excluded.map((e) => name(e.ingredientId)))),
    );
  }
  return { title, lines: lineVMs, rows, notes };
}
