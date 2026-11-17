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
import { servingsFor, pourMl, type BatchTarget } from './batch-target';
import { listNames } from './format';

export interface BatchLineVM {
  amount: string;
  name: string;
  /** Said when the line is not in the totals or its rounding is worth knowing. */
  note?: string;
}

/** What the sheet's field shows and where the other mode starts. */
export interface BatchControl {
  mode: 'drinks' | 'volume';
  /** The field's text: the number of drinks, or the target volume as shown. */
  fieldValue: string;
  /** The volume to start from when the user switches to a volume: today's drinks times one pour. */
  startMl?: number;
}

export interface BatchVM {
  title: string;
  control: BatchControl;
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
  target: BatchTarget,
  system: DisplaySystem,
  nameOf: (id: string) => string | undefined,
): BatchVM {
  const pour = pourMl(tree, method, lines);
  const volume = target.kind === 'volume';
  const title = volume
    ? strings.batch.titleVolume(text(target.ml, 'ml', system))
    : strings.batch.title(target.servings);
  const startMl =
    pour === undefined || volume
      ? undefined
      : Math.max(10, Math.round((target.servings * pour) / 10) * 10);
  const control: BatchControl = {
    mode: target.kind,
    fieldValue: volume ? text(target.ml, 'ml', system) : String(target.servings),
    ...(startMl !== undefined && { startMl }),
  };
  // Half a millilitre of slack: the sheet shows the pour rounded, and entering that must work.
  if (volume && pour !== undefined && target.ml + 0.5 < pour) {
    return {
      title,
      control,
      lines: [],
      rows: [],
      notes: [],
      failure: strings.batch.tooSmall(text(pour, 'ml', system)),
    };
  }
  // A volume with no pour known (no method) is passed on as one serving: the engine names the reason.
  const servings = volume
    ? pour === undefined
      ? 1
      : servingsFor(target.ml, pour)
    : target.servings;
  const result = prediluted(tree, { method, lines }, servings, { system });
  if (!result.ok) {
    const first = result.errors[0];
    return {
      title,
      control,
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
    ...(volume
      ? [
          {
            label: strings.batch.servingsFor,
            value: strings.batch.servingsOf(
              Math.round(servings * 10) / 10,
              text(batch.pourPerServingMl, 'ml', system),
            ),
          },
        ]
      : []),
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
  return { title, control, lines: lineVMs, rows, notes };
}
