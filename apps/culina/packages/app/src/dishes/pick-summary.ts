// What the closed folds of the random pick name: the choices that narrow "Surprise me" (the one
// filter and the stock tick) and what the roll per role is rolled under (the roles, the stock
// tick, and the choices of the filter a combination is judged by). Pure: the screen turns them
// into words (dish-random.ts).
import { activeChoices, type ActiveChoice } from '../browse/list-view';
import type { DishFilter } from '../browse/filter';
import { ROLE_IDS } from '../editor/units';

/** A choice that narrows "Surprise me": one of the filter, or "Only what the stock allows now". */
export type PickDishChoice = ActiveChoice | { kind: 'ready' };

/** The choices that narrow "Surprise me", in the order of the controls; none by default. */
export const pickDishChoices = (filter: DishFilter, ready: boolean): PickDishChoice[] => [
  ...activeChoices(filter),
  ...(ready ? [{ kind: 'ready' as const }] : []),
];

export interface PickRoleChoices {
  /** The ticked roles, in the order of the ticks. */
  roles: string[];
  onlyStock: boolean;
  /**
   * The choices of the one filter a combination is judged by (the character and "without meat
   * and fish", as `judgesCombination` in pick-judge.ts): they narrow this roll too, though their
   * controls stand in the fold of "Surprise me". The other choices of the filter do not apply.
   */
  judged: ActiveChoice[];
}

/**
 * What the roll per role is rolled under: the ticked roles in the order of the ticks, the stock
 * tick, and the judged choices of the filter.
 */
export const pickRoleChoices = (
  roles: ReadonlySet<string>,
  onlyStock: boolean,
  filter: DishFilter,
): PickRoleChoices => ({
  roles: ROLE_IDS.filter((role) => roles.has(role)),
  onlyStock,
  judged: activeChoices(filter).filter(
    (choice) => choice.kind === 'character' || choice.kind === 'meatFree',
  ),
});
