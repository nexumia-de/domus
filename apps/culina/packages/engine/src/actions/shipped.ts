// The shipped plain actions: data/actions.json, in the order of the file.
import raw from '../../data/actions.json';
import type { Action } from './types';

/** The shipped plain actions. The tests check that none shares its id with a technique. */
export const ACTIONS: readonly Action[] = raw as readonly Action[];

/**
 * A shipped plain action by id.
 *
 * @param id - An action id.
 * @returns The action, or `undefined` when there is none.
 */
export function actionById(id: string): Action | undefined {
  return ACTIONS.find((a) => a.id === id);
}
