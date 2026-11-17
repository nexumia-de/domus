// Assigns spec lines to the slots of one template by role and reports the
// lines that fit no slot and the slots that stay empty. No ratios here.
import { toMl, type UnitId } from '../amounts/index';
import { UNITS } from '../amounts/index';
import { resolveProperty } from '../ingredients/properties';
import type { IngredientTree } from '../ingredients/tree';
import type { Role } from '../ingredients/types';
import type {
  MatchLine,
  MatchOptions,
  SlotAssignment,
  SlotFill,
  Template,
  UnassignedReason,
  UnmeasuredReason,
} from './types';

const unitKind = new Map<string, string>(UNITS.map((u) => [u.id, u.kind]));

/**
 * The role a line has: its own, else the ingredient's resolved role.
 *
 * @param tree - A validated tree.
 * @param line - A spec line.
 * @returns The role, or why there is none (unknown ingredient, no role).
 */
export function lineRole(
  tree: IngredientTree,
  line: MatchLine,
): { role: Role } | { reason: UnassignedReason } {
  if (line.role) return { role: line.role };
  if (!tree.byId.has(line.ingredientId)) return { reason: 'unknown-ingredient' };
  const r = resolveProperty(tree, line.ingredientId, 'role');
  return r.value === undefined ? { reason: 'unknown-role' } : { role: r.value };
}

/**
 * The volume of a line.
 *
 * @param line - A spec line (amount in its unit, `topMl` in ml).
 * @param options - Unit overrides.
 * @returns Volume in ml, or why it has none (mass, `top` without volume, invalid amount).
 */
export function lineMl(
  line: MatchLine,
  options: MatchOptions = {},
): { ml: number } | { reason: UnmeasuredReason } {
  const kind = unitKind.get(line.unit);
  if (kind === 'mass') return { reason: 'mass' };
  if (kind === 'fill') {
    return line.topMl !== undefined && Number.isFinite(line.topMl) && line.topMl >= 0
      ? { ml: line.topMl }
      : { reason: 'top-without-volume' };
  }
  const amount = line.amountMax === undefined ? line.amount : (line.amount + line.amountMax) / 2;
  const r = toMl({ value: amount, unit: line.unit as UnitId }, options.unitOverrides);
  return r.ok ? { ml: r.value } : { reason: 'invalid-amount' };
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
export function assignSlots(
  tree: IngredientTree,
  template: Template,
  lines: readonly MatchLine[],
  options: MatchOptions = {},
): SlotAssignment {
  const fills: SlotFill[] = template.slots.map((s) => ({
    slotId: s.id,
    role: s.role,
    optional: s.optional === true,
    lineIndexes: [],
  }));
  const unassigned: SlotAssignment['unassigned'] = [];
  lines.forEach((line, index) => {
    const found = lineRole(tree, line);
    if ('reason' in found) {
      unassigned.push({ index, ingredientId: line.ingredientId, reason: found.reason });
      return;
    }
    const same = fills.filter((f) => f.role === found.role);
    const target = same.find((f) => f.lineIndexes.length === 0) ?? same[0];
    if (!target) {
      unassigned.push({ index, ingredientId: line.ingredientId, reason: 'no-slot-for-role' });
      return;
    }
    target.lineIndexes.push(index);
  });
  for (const f of fills) {
    let ml = 0;
    for (const i of f.lineIndexes) {
      const v = lineMl(lines[i] as MatchLine, options);
      if ('reason' in v) {
        f.unmeasured = v.reason;
        ml = Number.NaN;
        break;
      }
      ml += v.ml;
    }
    if (f.lineIndexes.length > 0 && f.unmeasured === undefined) f.ml = ml;
  }
  return {
    fills,
    unassigned,
    emptyRequired: fills
      .filter((f) => !f.optional && f.lineIndexes.length === 0)
      .map((f) => f.slotId),
    emptyOptional: fills
      .filter((f) => f.optional && f.lineIndexes.length === 0)
      .map((f) => f.slotId),
  };
}
