// Measuring spec lines by volume: the measure that slot ratios use today
// (ml from the unit table, `topMl`, counted units with their own volume),
// and `assignSlots` with that measure. Drink side: it reads the unit table,
// which stays in Mixtura (docs/decisions/shared-model.md).
import { toMl, UNITS, type UnitId, type UnitOverrides } from '../amounts/index';
import type { IngredientTreeOf } from '@nexumia-de/materia';
import { countedVolume } from '../drink-ingredients/unit-volumes';
import { fillSlots, type RoledTree } from '@nexumia-de/materia';
import type {
  LineMeasure,
  MatchLine,
  SlotAssignment,
  Template,
  UnmeasuredReason,
} from '@nexumia-de/materia';

/** What the volume measure reads of the caller's options. */
export interface VolumeOptions {
  unitOverrides?: UnitOverrides;
}

const unitKind = new Map<string, string>(UNITS.map((u) => [u.id, u.kind]));

/**
 * The volume of a line.
 *
 * @param line - A spec line (amount in its unit, `topMl` in ml).
 * @param options - Unit overrides.
 * @param tree - A tree whose ingredients may carry `unitVolumes`; without it a counted line has no volume.
 * @returns Volume in ml, or why it has none (mass, `top` without volume, counted without volume, invalid amount).
 */
export function lineMl(
  line: MatchLine,
  options: VolumeOptions = {},
  tree?: IngredientTreeOf,
): { ml: number } | { reason: UnmeasuredReason } {
  const kind = unitKind.get(line.unit);
  if (kind === 'mass') return { reason: 'mass' };
  if (kind === 'fill') {
    return line.topMl !== undefined && Number.isFinite(line.topMl) && line.topMl >= 0
      ? { ml: line.topMl }
      : { reason: 'top-without-volume' };
  }
  if (kind === 'count') {
    const amount = line.amountMax === undefined ? line.amount : (line.amount + line.amountMax) / 2;
    const cv = tree ? countedVolume(tree, line.ingredientId, line.unit, amount) : undefined;
    return cv ? { ml: cv.ml } : { reason: 'counted-without-volume' };
  }
  const amount = line.amountMax === undefined ? line.amount : (line.amount + line.amountMax) / 2;
  const r = toMl({ value: amount, unit: line.unit as UnitId }, options.unitOverrides);
  return r.ok ? { ml: r.value } : { reason: 'invalid-amount' };
}

/** `lineMl` as a measure for `fillSlots` and `matchTemplates`. */
export function volumeMeasure<R extends string>(
  options: VolumeOptions,
  tree: IngredientTreeOf | undefined,
): LineMeasure<R> {
  return (line) => {
    const v = lineMl(line, options, tree);
    return 'reason' in v ? v : { value: v.ml };
  };
}

/**
 * Assigns spec lines to the slots of a template by role.
 *
 * @param tree - A validated tree that gives each ingredient its role.
 * @param template - A template.
 * @param lines - Spec lines with amounts in units of the unit table.
 * @param options - Unit overrides.
 * @returns Per slot the lines and their volume in ml, the unassigned lines and the empty slots.
 */
export function assignSlots<R extends string>(
  tree: RoledTree<R>,
  template: Template<R>,
  lines: readonly MatchLine<R>[],
  options: VolumeOptions = {},
): SlotAssignment<R> {
  return fillSlots(tree, template, lines, volumeMeasure(options, tree));
}
