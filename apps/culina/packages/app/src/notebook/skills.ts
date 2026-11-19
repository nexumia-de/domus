// Skill state: which techniques the user marked as learned. One record per technique, written through
// the store and then shown in the cache. It does not tell the screens (no `emit`): the screen that
// writes redraws itself, so focus and the place in a dish stay where they are.
import { learnedTechniques, skillRecord } from '@culina/engine';
import { fail, type Result } from '../store/types';
import { state } from './state';

/** The technique ids marked as learned. */
export const learnedSkills = (): Set<string> => learnedTechniques(state.skills);

/**
 * Marks a technique as learned, or takes the mark back.
 *
 * @param technique - A technique id.
 * @param learned - True to mark, false for "Teach again" (the record stays, as learned false).
 */
export const setLearned = async (technique: string, learned: boolean): Promise<Result> => {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const record = skillRecord(technique, learned);
  const written = await state.store.put('skills', record);
  if (!written.ok) return written;
  state.skills = [...state.skills.filter((s) => s.id !== record.id), record];
  return { ok: true };
};
