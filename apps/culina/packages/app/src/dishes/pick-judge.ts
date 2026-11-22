// Whether a combination of the random pick fits the one filter over every dish. The combination is
// a dish that does not exist yet, so it is put together in memory (one slot per picked component,
// no amounts) and judged as a dish of the notebook is (`entryOfDish`): its characters, and "without
// meat and fish" derived the same way. Only those two choices can be judged; origin, course,
// cuisine and "every amount given" say nothing about a combination. Pure: no DOM, no store.
import { entryOfDish } from '../browse/entry';
import type { DishFilter } from '../browse/filter';
import type { Lookup } from '../characters/classes';
import type { DishRecord, Notebook } from '../records';
import type { Candidate } from './alternatives';
import type { Fits } from './pick';

/** True when the filter has a choice that a combination can be judged by. */
export const judgesCombination = (filter: DishFilter): boolean =>
  filter.character !== undefined || filter.meatFree === true;

/** The combination as a dish record in memory: one slot per component, in role and id order. */
export const combinationDish = (choices: readonly Candidate[]): DishRecord => {
  const sorted = [...choices].sort(
    (a, b) => a.role.localeCompare(b.role) || a.id.localeCompare(b.id),
  );
  return {
    id: 'pick',
    name: '',
    slots: sorted.map((c) => ({ role: c.role, ref: { kind: 'component', id: c.id } })),
    version: { family: 'pick', date: '' },
  } as DishRecord;
};

/**
 * The judge of combinations for the filter, or undefined when the filter has nothing to judge a
 * combination by. Each combination is judged once (kept by its components).
 */
export const combinationJudge = (
  nb: Notebook,
  lookup: Lookup,
  filter: DishFilter,
): Fits | undefined => {
  if (!judgesCombination(filter)) return undefined;
  const known = new Map<string, boolean>();
  return (choices) => {
    const dish = combinationDish(choices);
    const key = dish.slots.map((s) => `${s.role}:${s.ref.id}`).join('|');
    const kept = known.get(key);
    if (kept !== undefined) return kept;
    const entry = entryOfDish(nb, dish, lookup);
    const fits =
      (filter.character === undefined || entry.characters.includes(filter.character)) &&
      (filter.meatFree !== true || entry.meatFree === true);
    known.set(key, fits);
    return fits;
  };
};
