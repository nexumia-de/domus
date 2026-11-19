// Buy Next as a view model: the engine's ranking with names, the drinks
// each candidate unlocks (by name, each with its lineage for the link) and
// the brands folded into a type. Pure.

import type { UnlockResult } from '@mixtura/engine';
import type { BrowseModel } from '../browse/model';

export interface UnlockedDrink {
  lineageId: string;
  name: string;
}

export interface Candidate {
  id: string;
  name: string;
  kind: 'product' | 'type';
  count: number;
  /** Of the unlocked drinks, how many need a substitute (only in the mode with substitutes). */
  substituted: number;
  drinks: UnlockedDrink[];
  /** Names of the products folded into this type, by name. */
  alsoBy: string[];
}

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

export function candidatesOf(model: BrowseModel, result: UnlockResult): Candidate[] {
  return result.ranking.map((c) => {
    const drinks = c.unlocks
      .map((id) => model.specById.get(id))
      .flatMap((spec) => (spec ? [{ lineageId: spec.lineageId, name: spec.name }] : []))
      .sort(byName);
    return {
      id: c.ingredientId,
      name: model.ingredientName(c.ingredientId) ?? c.ingredientId,
      kind: c.kind,
      count: c.count,
      substituted: c.unlocks.length - c.strict.length,
      drinks,
      alsoBy: c.alsoBy
        .map((id) => ({ name: model.ingredientName(id) ?? id }))
        .sort(byName)
        .map((n) => n.name),
    };
  });
}
