// The shipped techniques: every file of data/techniques/, through the generated index.
import { RAW_TECHNIQUES } from './techniques.generated';
import type { Technique } from './types';

/** The shipped techniques in file name order. The tests check each against its schema. */
export const TECHNIQUES: readonly Technique[] = RAW_TECHNIQUES as readonly Technique[];

const byId = new Map(TECHNIQUES.map((t) => [t.id, t]));

/**
 * A shipped technique by id.
 *
 * @param id - A technique id.
 * @returns The technique, or `undefined` when there is none.
 */
export function techniqueById(id: string): Technique | undefined {
  return byId.get(id);
}
