// The alcohol class of a drink for the list: the engine's `classifyAlcohol`
// on the drink's balance, with the thresholds the user chose in Settings, and
// the counts and reasons the list shows for what could not be classified
// (docs/non-alcoholic.md#as-built-36, docs/screens-browse.md#alcohol-filters).
// The class is about the calculated number, never a legal term.

import {
  alcoholThresholds,
  classifyAlcohol,
  type AlcoholClass,
  type AlcoholThresholds,
  type AlcoholUnknownReason,
} from '@mixtura/engine';
import type { BrowseModel, Drink } from './model';

export interface DrinkAlcohol {
  class: AlcoholClass;
  abvPct?: number;
  /** Why the class is `unknown`; `balance` when the balance could not be computed at all. */
  reason?: AlcoholUnknownReason | 'balance';
  /** Names of the ingredients behind the reason, when there are any. */
  ingredients?: string[];
}

/** The thresholds for the preset ids kept in Settings. */
export function thresholdsFor(withoutId: string, lowId: string): AlcoholThresholds {
  return alcoholThresholds(withoutId, lowId);
}

const key = (t: AlcoholThresholds): string => `${t.withoutBound}${t.withoutPct}/${t.lowPct}`;
const cache = new WeakMap<BrowseModel, Map<string, DrinkAlcohol>>();

/** The class of one drink under these thresholds; computed once per model and thresholds. */
export function alcoholOf(
  model: BrowseModel,
  drink: Drink,
  thresholds: AlcoholThresholds,
): DrinkAlcohol {
  let byKey = cache.get(model);
  if (!byKey) cache.set(model, (byKey = new Map()));
  const id = `${key(thresholds)}|${drink.spec.id}`;
  const known = byKey.get(id);
  if (known) return known;
  const balance = model.balanceOf(drink.spec);
  let result: DrinkAlcohol;
  if (!balance.ok) result = { class: 'unknown', reason: 'balance' };
  else {
    const c = classifyAlcohol(balance.value, model.tree, thresholds);
    const ids = c.ids?.map((i) => model.ingredientName(i) ?? i);
    result = {
      class: c.class,
      ...(c.abvPct !== undefined ? { abvPct: c.abvPct } : {}),
      ...(c.reason ? { reason: c.reason } : {}),
      ...(ids && ids.length > 0 ? { ingredients: ids } : {}),
    };
  }
  byKey.set(id, result);
  return result;
}

export interface AlcoholTally {
  none: number;
  low: number;
  standard: number;
  unknown: number;
}

/** How many of these drinks fall in each class. */
export function tallyAlcohol(
  model: BrowseModel,
  drinks: readonly Drink[],
  thresholds: AlcoholThresholds,
): AlcoholTally {
  const tally: AlcoholTally = { none: 0, low: 0, standard: 0, unknown: 0 };
  for (const drink of drinks) tally[alcoholOf(model, drink, thresholds).class] += 1;
  return tally;
}

export interface UnknownGroup {
  reason: DrinkAlcohol['reason'];
  drinks: { drink: Drink; ingredients: string[] }[];
}

/** The drinks whose class is unknown, grouped by reason, largest group first. */
export function unknownGroups(
  model: BrowseModel,
  drinks: readonly Drink[],
  thresholds: AlcoholThresholds,
): UnknownGroup[] {
  const groups = new Map<DrinkAlcohol['reason'], UnknownGroup>();
  for (const drink of drinks) {
    const a = alcoholOf(model, drink, thresholds);
    if (a.class !== 'unknown') continue;
    const group = groups.get(a.reason) ?? { reason: a.reason, drinks: [] };
    group.drinks.push({ drink, ingredients: a.ingredients ?? [] });
    groups.set(a.reason, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.drinks.length - a.drinks.length || String(a.reason).localeCompare(String(b.reason)),
  );
}
