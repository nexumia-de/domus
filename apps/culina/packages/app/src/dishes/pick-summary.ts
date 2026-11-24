// What the closed folds of the random pick name: the choices that narrow "Surprise me" (the one
// filter and the stock tick) and the roles and the stock tick of the roll per role. Pure: the
// screen turns them into words (dish-random.ts).
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
}

/** The roles ticked for the roll per role, in the order of the ticks, and the stock tick. */
export const pickRoleChoices = (
  roles: ReadonlySet<string>,
  onlyStock: boolean,
): PickRoleChoices => ({
  roles: ROLE_IDS.filter((role) => roles.has(role)),
  onlyStock,
});
