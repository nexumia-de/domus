// The stock panel of the spec screen as data (#82): per line whether the
// stock has it, a substitute stands in, or it is missing, from the engine's
// `makeableSpecs` in the mode with substitutes. Nothing is stored; results
// are kept per browse model and per records object.

import {
  buildStockIndex,
  makeableSpecs,
  type LineResult,
  type SpecResult,
  type StockIndex,
} from '@mixtura/engine';
import type { BrowseModel } from '../browse/model';
import type { SpecData } from '../browse/types';
import { hasStock } from '../../stock/derived';
import type { StockRecords } from '../../stock/state';
import { stockStrings as t } from './stock-strings';

export type LineState = 'have' | 'prepared' | 'substitute' | 'missing' | 'optional' | 'unknown';

export interface StockRowVM {
  /** Position of the line in the spec. */
  index: number;
  state: LineState;
  text: string;
  /** For a line with exactly one missing ingredient: what Mark in stock and Buy Next act on. */
  missingId?: string;
  missingName?: string;
}

export interface StockPanelVM {
  /** `none`: nothing is in stock, so no row says anything. */
  kind: 'none' | 'makeable' | 'substitute' | 'missing' | 'unknown';
  tag: string;
  rows: StockRowVM[];
}

interface PerModel {
  index: StockIndex;
  reports: WeakMap<StockRecords, ReadonlyMap<string, SpecResult>>;
}
const models = new WeakMap<BrowseModel, PerModel>();

function perModel(model: BrowseModel): PerModel {
  let found = models.get(model);
  if (!found) {
    // The drinks plus the recipes of prepared ingredients, as `deriveStock` does.
    const specs = new Map(model.drinks.map((d) => [d.spec.id, d.spec]));
    for (const entry of model.tree.byId.values()) {
      const recipe = entry.prepared ? model.specById.get(entry.prepared.specId) : undefined;
      if (recipe) specs.set(recipe.id, recipe);
    }
    found = { index: buildStockIndex(model.tree, [...specs.values()]), reports: new WeakMap() };
    models.set(model, found);
  }
  return found;
}

/** Results of every spec (retired included) with substitutes allowed, once per records object. */
function resultsFor(model: BrowseModel, records: StockRecords): ReadonlyMap<string, SpecResult> {
  const mine = perModel(model);
  let known = mine.reports.get(records);
  if (!known) {
    const entries = [...records.values()].map((r) => ({
      ingredientId: r.ingredientId,
      present: r.present,
    }));
    const report = makeableSpecs(mine.index, entries, {
      mode: 'with-substitutes',
      excludeStatuses: [],
    });
    known = new Map(report.specs.map((s) => [s.specId, s]));
    mine.reports.set(records, known);
  }
  return known;
}

const nameOf = (model: BrowseModel, id: string): string => model.ingredientName(id) ?? id;

function rowOf(model: BrowseModel, line: LineResult, index: number): StockRowVM {
  const asked = nameOf(model, line.ingredientId);
  if (line.reason === 'unknown-ingredient') {
    return { index, state: 'unknown', text: t.unknown(line.ingredientId) };
  }
  if (line.satisfied) {
    const by = nameOf(model, line.by ?? line.ingredientId);
    if (line.rule === 'listed-substitute' || line.rule === 'class-substitute') {
      return { index, state: 'substitute', text: t.substitute(by, asked) };
    }
    if (line.rule === 'prepared') {
      return {
        index,
        state: line.substituted ? 'substitute' : 'prepared',
        text: t.prepared(by),
      };
    }
    return { index, state: 'have', text: t.have(by, by === asked ? undefined : asked) };
  }
  const one = line.missing.length === 1 ? line.missing[0] : undefined;
  const missingName = one === undefined ? undefined : nameOf(model, one);
  const text = line.optional
    ? t.optionalMissing(asked)
    : one !== undefined && one === line.ingredientId
      ? t.missing(asked)
      : t.missingParts(line.missing.map((id) => nameOf(model, id)).join(', '));
  return {
    index,
    state: line.optional ? 'optional' : 'missing',
    text,
    ...(one !== undefined && !line.optional && { missingId: one, missingName }),
  };
}

/**
 * The panel of one drink, or undefined when the drink is not among the specs
 * the engine knows (a draft, a swap).
 */
export function stockPanelVM(
  model: BrowseModel,
  spec: SpecData,
  records: StockRecords,
): StockPanelVM | undefined {
  const result = resultsFor(model, records).get(spec.id);
  if (!result) return undefined;
  if (!hasStock(model, records)) return { kind: 'none', tag: '', rows: [] };
  const rows = result.lines.map((line, i) => rowOf(model, line, i));
  const missing = result.missing;
  const kind: StockPanelVM['kind'] =
    result.status === 'makeable'
      ? 'makeable'
      : result.status === 'makeable-with-substitution'
        ? 'substitute'
        : result.status === 'unknown-ingredient'
          ? 'unknown'
          : 'missing';
  const tag =
    kind === 'makeable'
      ? t.tagMakeable
      : kind === 'substitute'
        ? t.tagSubstitute
        : kind === 'unknown'
          ? t.tagUnknown
          : missing.length === 1
            ? t.tagMissing(nameOf(model, missing[0] as string))
            : t.tagMissingMany(missing.length);
  return { kind, tag, rows };
}
