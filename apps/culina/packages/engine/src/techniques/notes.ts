// Which technique notes to show for the steps of a dish, given what the user has learned.
import type { Step } from '../steps/types';
import type { Technique } from './types';

/** A note to show: the index of the step it belongs to and the technique. */
export interface TechniqueNote {
  step: number;
  technique: Technique;
}

/** Result of `techniqueNotes`. */
export type NotesResult =
  | { ok: true; notes: TechniqueNote[] }
  | { ok: false; error: { code: 'unknown-technique'; step: number; id: string } };

/**
 * The technique notes to show along a list of steps. A note shows at the
 * **first** step that uses a technique the user has not marked as learned,
 * not at every use: repeated at each fold or each sear it would become noise,
 * and the cook can open the technique again from any step that names it.
 * Steps without a technique, and learned techniques, give no note.
 *
 * @param steps - The steps in cooking order, all components of a dish together.
 * @param techniques - The known techniques; every step's technique must be in it.
 * @param learned - Ids of the techniques the user marked as learned.
 * @returns The notes in step order, or `unknown-technique` with the step index and id.
 */
export function techniqueNotes(
  steps: readonly Step[],
  techniques: readonly Technique[],
  learned: ReadonlySet<string>,
): NotesResult {
  const byId = new Map(techniques.map((t) => [t.id, t]));
  const shown = new Set<string>();
  const notes: TechniqueNote[] = [];
  for (const [step, s] of steps.entries()) {
    if (s.technique === undefined) continue;
    const technique = byId.get(s.technique);
    if (technique === undefined) {
      return { ok: false, error: { code: 'unknown-technique', step, id: s.technique } };
    }
    if (learned.has(s.technique) || shown.has(s.technique)) continue;
    shown.add(s.technique);
    notes.push({ step, technique });
  }
  return { ok: true, notes };
}
