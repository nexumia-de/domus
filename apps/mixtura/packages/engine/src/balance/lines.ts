// Turns spec lines into the parts the mixture formulas read: every amount to
// ml (or g of solid sugar) with the amounts module, every property from the
// ingredient tree or, for a prepared ingredient, from its spec.
import { toGrams, toMl, isEstimatedUnit, UNITS } from '../amounts/index';
import type { UnitId, UnitOverrides } from '../amounts/index';
import type { MixPart } from '../ingredients/mixture';
import { computePrepared, type SpecLookup } from '../ingredients/prepared';
import { resolveProperty } from '../ingredients/properties';
import type { IngredientTree } from '../ingredients/tree';
import type { Id } from '../ingredients/types';
import type { BalanceError, BalanceLine, Excluded } from './types';

export type Property = 'abv' | 'sugar' | 'acid';
export type UnknownIds = Record<Property, Id[]>;

export interface ResolvedLines {
  parts: MixPart[];
  /** Ids whose property is needed (volume above 0, or sugar of a solid) but unknown. */
  unknown: UnknownIds;
  estimatedIds: Id[];
  excluded: Excluded[];
}

type Props = Partial<Record<Property, number>>;

const kindOf = new Map<string, { kind: string; id: UnitId }>(
  UNITS.map((u) => [u.id, { kind: u.kind, id: u.id }]),
);

function propsOf(tree: IngredientTree, specs: SpecLookup, id: Id): Props {
  const item = tree.byId.get(id);
  if (!item) return {};
  if (item.prepared) {
    const c = computePrepared(tree, specs, id);
    if (!c.ok) return {};
    return { abv: c.value.abv.value, sugar: c.value.sugar.value, acid: c.value.acid.value };
  }
  return {
    abv: resolveProperty(tree, id, 'abv').value,
    sugar: resolveProperty(tree, id, 'sugar').value,
    acid: resolveProperty(tree, id, 'acid').value,
  };
}

function push(list: Id[], id: Id) {
  if (!list.includes(id)) list.push(id);
}

/**
 * Mass units count as solid sugar: g * sugar / 100 grams of sugar, volume 0.
 * A `top` line counts as its `topMl`; without it the line is excluded.
 */
export function resolveLines(
  tree: IngredientTree,
  specs: SpecLookup,
  lines: readonly BalanceLine[],
  overrides?: UnitOverrides,
): { ok: true; value: ResolvedLines } | { ok: false; errors: BalanceError[] } {
  const out: ResolvedLines = {
    parts: [],
    unknown: { abv: [], sugar: [], acid: [] },
    estimatedIds: [],
    excluded: [],
  };
  const errors: BalanceError[] = [];
  const cache = new Map<Id, Props>();
  const props = (id: Id) => {
    let p = cache.get(id);
    if (!p) cache.set(id, (p = propsOf(tree, specs, id)));
    return p;
  };
  const fail = (code: BalanceError['code'], id: Id, message: string) =>
    errors.push({ code, ids: [id], message: `${id}: ${message}` });

  for (const line of lines) {
    const id = line.ingredientId;
    const unit = kindOf.get(line.unit);
    if (!unit) {
      fail('unknown-unit', id, `unit "${line.unit}" is not in the unit table`);
      continue;
    }
    const p = props(id);
    let ml = 0;
    let sugarG: number | undefined;
    if (unit.kind === 'fill') {
      if (line.topMl === undefined) {
        out.excluded.push({ ingredientId: id, reason: 'top-without-volume' });
        continue;
      }
      if (!Number.isFinite(line.topMl) || line.topMl < 0) {
        fail('invalid-top', id, 'the volume of a top line must be zero or more');
        continue;
      }
      ml = line.topMl;
    } else if (unit.kind === 'volume') {
      const r = toMl({ value: line.amount, unit: unit.id }, overrides);
      if (!r.ok) {
        fail('invalid-amount', id, r.error.message);
        continue;
      }
      ml = r.value;
      if (isEstimatedUnit(unit.id) && ml > 0) push(out.estimatedIds, id);
    } else {
      const r = toGrams({ value: line.amount, unit: unit.id });
      if (!r.ok) {
        fail('invalid-amount', id, r.error.message);
        continue;
      }
      if (p.sugar === undefined) push(out.unknown.sugar, id);
      else sugarG = (r.value * p.sugar) / 100;
    }
    if (ml > 0) {
      for (const k of ['abv', 'sugar', 'acid'] as const)
        if (p[k] === undefined) push(out.unknown[k], id);
    }
    out.parts.push({ id, ml, abv: p.abv, sugar: p.sugar, acid: p.acid, sugarG });
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: out };
}
