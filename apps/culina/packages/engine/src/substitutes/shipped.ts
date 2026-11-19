// The shipped substitutes: every file of data/substitutes/, through the generated index.
import { RAW_SUBSTITUTES } from './substitutes.generated';
import type { Substitute } from './types';

/** The shipped substitutes in file name order. The tests check each against its schema. */
export const SUBSTITUTES: readonly Substitute[] = RAW_SUBSTITUTES as readonly Substitute[];

/** A shipped substitute by id, or `undefined`. */
export function substituteById(id: string): Substitute | undefined {
  // A scan, not a map built at load time: the main script does not carry the substitutes.
  return SUBSTITUTES.find((s) => s.id === id);
}
